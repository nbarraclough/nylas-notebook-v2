import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationData(userId: string) {
  return useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      // Get user's profile with organization info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            domain
          )
        `)
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

      // Get organization members with their profiles
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          organization_members!inner (
            role
          )
        `)
        .eq('organization_id', profile.organization_id);

      if (membersError) {
        console.error('Members fetch error:', membersError);
        throw membersError;
      }

      // Transform the data into the expected format
      const formattedMembers = members?.map(member => ({
        user_id: member.id,
        role: member.organization_members[0].role,
        profiles: {
          email: member.email
        }
      })) || [];

      return {
        organization: profile.organizations,
        members: formattedMembers
      };
    },
    enabled: !!userId,
    retry: false,
  });
}