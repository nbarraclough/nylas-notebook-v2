import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationData(userId: string) {
  return useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      console.log('Fetching organization data for user:', userId);
      
      // First get the organization ID directly from profiles
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

      // Get member roles in a direct query
      const { data: memberRoles, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', profile.organization_id);

      if (membersError) {
        console.error('Members fetch error:', membersError);
        throw membersError;
      }

      // Get profiles in a separate query
      const memberIds = memberRoles?.map(m => m.user_id) || [];
      const { data: memberProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', memberIds);

      if (profilesError) {
        console.error('Member profiles fetch error:', profilesError);
        throw profilesError;
      }

      // Combine the data
      const membersWithProfiles = memberRoles?.map(member => ({
        user_id: member.user_id,
        role: member.role,
        profiles: memberProfiles?.find(p => p.id === member.user_id) || { email: 'Unknown' }
      })) || [];

      console.log('Successfully fetched organization data:', {
        organizationId: profile.organization_id,
        memberCount: membersWithProfiles?.length
      });

      return {
        organization,
        members: membersWithProfiles
      };
    },
    enabled: !!userId,
    retry: false,
  });
}