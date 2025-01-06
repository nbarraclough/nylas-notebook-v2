import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationData(userId: string) {
  return useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      // First get the user's organization ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) {
        return { organization: null, members: [] };
      }

      // Get organization details
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;

      // Get members separately
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          organization_members!inner (
            role
          )
        `)
        .eq('organization_id', profile.organization_id);

      if (membersError) throw membersError;

      const members = membersData.map(member => ({
        user_id: member.id,
        role: member.organization_members[0]?.role || 'user',
        profiles: { email: member.email }
      }));

      return {
        organization,
        members
      };
    },
    enabled: !!userId,
  });
}