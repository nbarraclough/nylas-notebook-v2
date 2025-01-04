import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MembersList } from "./organization/MembersList";
import { OrganizationInfo } from "./organization/OrganizationInfo";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organizationData, isLoading } = useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      console.log('Fetching organization data for user:', userId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const response = await fetch(
        'https://xqzlejcvvtjdrabofrxs.supabase.co/functions/v1/get-organization-data',
        {
          headers: {
            Authorization: `Bearer ${userId}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching organization data:', error);
        throw new Error(error.message || 'Failed to fetch organization data');
      }

      const data = await response.json();
      console.log('Organization data:', data);
      return data;
    },
    enabled: !!userId,
  });

  const handlePromoteUser = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: 'admin' })
        .eq('user_id', memberId)
        .eq('organization_id', organizationData?.organization?.id);

      if (error) throw error;

      // Invalidate the query to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['organization_data', userId],
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
        .eq('organization_id', organizationData?.organization?.id);

      if (memberError) throw memberError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', memberId);

      if (profileError) throw profileError;

      // Invalidate the query to refresh the data
      await queryClient.invalidateQueries({
        queryKey: ['organization_data', userId],
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!organizationData?.organization) {
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

  const isAdmin = organizationData.members.some(
    member => member.user_id === userId && member.role === 'admin'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrganizationInfo
          name={organizationData.organization.name}
          domain={organizationData.organization.domain}
          userRole={organizationData.members.find(m => m.user_id === userId)?.role || 'user'}
        />

        <div>
          <Label>Members</Label>
          <MembersList
            members={organizationData.members}
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