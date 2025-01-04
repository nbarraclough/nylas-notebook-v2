import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MembersList } from "./organization/MembersList";
import { OrganizationInfo } from "./organization/OrganizationInfo";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { toast } = useToast();

  // Fetch user's organization details including members
  const { data: organizationData, refetch: refetchOrg } = useQuery({
    queryKey: ['organization', userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (!profile?.organization_id) return null;

      const { data: org } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members(
            user_id,
            role,
            profiles(
              email
            )
          )
        `)
        .eq('id', profile.organization_id)
        .single();

      return org;
    },
    enabled: !!userId,
  });

  const isAdmin = organizationData?.organization_members?.some(
    member => member.user_id === userId && member.role === 'admin'
  );

  const handlePromoteUser = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: 'admin' })
        .eq('user_id', memberId)
        .eq('organization_id', organizationData.id);

      if (error) throw error;

      await refetchOrg();
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
        .eq('organization_id', organizationData.id);

      if (memberError) throw memberError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', memberId);

      if (profileError) throw profileError;

      await refetchOrg();
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

  if (!organizationData) {
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
          name={organizationData.name}
          domain={organizationData.domain}
          userRole={organizationData.organization_members.find(m => m.user_id === userId)?.role || 'user'}
        />

        <div>
          <Label>Members</Label>
          <MembersList
            members={organizationData.organization_members}
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