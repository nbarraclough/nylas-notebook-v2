import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationData(userId: string) {
  return useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      // Get user's organization ID from profile
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

      // Get organization members with their profiles
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles (
            email
          )
        `)
        .eq('organization_id', profile.organization_id);

      if (membersError) throw membersError;

      return {
        organization,
        members: members || []
      };
    },
    enabled: !!userId,
  });
}