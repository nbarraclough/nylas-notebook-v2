import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationData(userId: string) {
  return useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      console.log('Fetching organization data for user:', userId);
      
      // First get the user's organization ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      if (!profile?.organization_id) {
        console.log('No organization found for user');
        return { organization: null, members: [] };
      }

      // Get organization details
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Organization fetch error:', orgError);
        throw orgError;
      }

      // Get organization members separately
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            email
          )
        `)
        .eq('organization_id', profile.organization_id);

      if (membersError) {
        console.error('Members fetch error:', membersError);
        throw membersError;
      }

      const members = membersData.map(member => ({
        user_id: member.user_id,
        role: member.role,
        profiles: { email: member.profiles?.email }
      }));

      console.log('Successfully fetched organization data:', {
        organizationId: profile.organization_id,
        memberCount: members.length
      });

      return {
        organization,
        members
      };
    },
    enabled: !!userId,
    retry: false,
  });
}