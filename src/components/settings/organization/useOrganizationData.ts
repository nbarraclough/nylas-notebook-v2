import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useOrganizationData = (userId: string) => {
  return useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      console.log('Fetching organization data for user:', userId);
      
      // First check if we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session found');
        throw new Error('No active session');
      }

      // Get user's organization ID first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      if (!profile?.organization_id) {
        console.log('User has no organization');
        return { organization: null, members: [] };
      }

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        throw orgError;
      }

      // Get members with a left join
      console.log('Fetching members for organization:', profile.organization_id);
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          organization_members (
            role
          )
        `)
        .eq('organization_id', profile.organization_id);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }

      // Transform members data to include role
      const members = membersData.map(member => ({
        user_id: member.id,
        email: member.email,
        role: member.organization_members?.[0]?.role || 'user',
        profiles: {
          email: member.email
        }
      }));

      console.log('Successfully fetched organization data:', {
        orgId: org.id,
        memberCount: members.length
      });

      return {
        organization: org,
        members
      };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};