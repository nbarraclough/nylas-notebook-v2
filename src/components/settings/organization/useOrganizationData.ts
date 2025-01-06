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

      // First get all profiles in the organization
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('organization_id', profile.organization_id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Then get their roles from organization_members separately
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', profile.organization_id);

      if (membersError) {
        console.error('Error fetching member roles:', membersError);
        throw membersError;
      }

      // Combine the data
      const members = profilesData.map(profile => {
        const memberData = membersData?.find(m => m.user_id === profile.id);
        return {
          user_id: profile.id,
          role: memberData?.role || 'user',
          profiles: {
            email: profile.email
          }
        };
      });

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