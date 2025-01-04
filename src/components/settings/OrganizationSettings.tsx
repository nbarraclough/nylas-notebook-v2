import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateJoinOrganization } from "./organization/CreateJoinOrganization";
import { MembersList } from "./organization/MembersList";
import { AddMemberForm } from "./organization/AddMemberForm";

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
          organization_members!inner(
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

  const handleAddUser = async (email: string) => {
    try {
      // First get the user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError) throw new Error('User not found');

      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: organizationData.id,
          user_id: userProfile.id,
          role: 'user'
        }]);

      if (memberError) throw memberError;

      // Update user's profile with organization
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ organization_id: organizationData.id })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      await refetchOrg();
      toast({
        title: "Success",
        description: "User added successfully!",
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user. Please check the email and try again.",
        variant: "destructive",
      });
    }
  };

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
      // Remove from organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', memberId)
        .eq('organization_id', organizationData.id);

      if (memberError) throw memberError;

      // Update user's profile to remove organization
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
    return <CreateJoinOrganization userId={userId} onOrganizationUpdate={refetchOrg} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div>
            <Label>Organization Name</Label>
            <p className="text-sm text-muted-foreground">{organizationData.name}</p>
          </div>
          <div>
            <Label>Domain</Label>
            <p className="text-sm text-muted-foreground">{organizationData.domain}</p>
          </div>
          <div>
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground">
              {organizationData.organization_members.find(m => m.user_id === userId)?.role === 'admin' ? 'Admin' : 'Member'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-4">
            <AddMemberForm onAddMember={handleAddUser} />
            <div>
              <Label>Members</Label>
              <MembersList
                members={organizationData.organization_members}
                currentUserId={userId}
                onPromoteUser={handlePromoteUser}
                onRemoveUser={handleRemoveUser}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};