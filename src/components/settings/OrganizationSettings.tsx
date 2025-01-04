import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MembersList } from "./organization/MembersList";
import { OrganizationInfo } from "./organization/OrganizationInfo";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { toast } = useToast();

  // First query: Get user's organization ID
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      console.log('Profile data:', data);
      return data;
    },
    enabled: !!userId,
  });

  // Second query: Get organization details
  const { data: organization } = useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      console.log('Fetching organization:', profile?.organization_id);
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile?.organization_id)
        .maybeSingle();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        throw orgError;
      }

      console.log('Organization data:', org);
      return org;
    },
    enabled: !!profile?.organization_id,
  });

  // Third query: Get organization members
  const { data: members } = useQuery({
    queryKey: ['organization_members', profile?.organization_id],
    queryFn: async () => {
      console.log('Fetching organization members');
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles (
            email
          )
        `)
        .eq('organization_id', profile?.organization_id);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }

      console.log('Members data:', members);
      return members;
    },
    enabled: !!profile?.organization_id,
  });

  const isAdmin = members?.some(
    member => member.user_id === userId && member.role === 'admin'
  );

  const handlePromoteUser = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: 'admin' })
        .eq('user_id', memberId)
        .eq('organization_id', profile?.organization_id);

      if (error) throw error;

      // Invalidate the members query to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['organization_members', profile?.organization_id],
      });

      toast({
        title: "Success",
        description: "User promoted to admin successfully!",
      });
    } catch (error: any) {
      console.error('Error promoting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to promote user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (memberId: string) => {
    try {
      const { error: memberError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', memberId)
        .eq('organization_id', profile?.organization_id);

      if (memberError) throw memberError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', memberId);

      if (profileError) throw profileError;

      // Invalidate the members query to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['organization_members', profile?.organization_id],
      });

      toast({
        title: "Success",
        description: "User removed successfully!",
      });
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!organization || !members) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No organization found. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrganizationInfo
          name={organization.name}
          domain={organization.domain}
          userRole={members.find(m => m.user_id === userId)?.role || 'user'}
        />

        <div>
          <Label>Members</Label>
          <MembersList
            members={members}
            currentUserId={userId}
            isAdmin={isAdmin}
            onPromoteUser={handlePromoteUser}
            onRemoveUser={handleRemoveUser}
          />
        </div>
      </CardContent>
    </Card>
  );
};