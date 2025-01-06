import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MembersList } from "./organization/MembersList";
import { OrganizationInfo } from "./organization/OrganizationInfo";
import { CreateJoinOrganization } from "./organization/CreateJoinOrganization";
import { getUserDomain, isFreeDomain } from "@/utils/emailDomains";
import { useEffect, useState } from "react";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);

  // Get and maintain session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: organizationData, isLoading } = useQuery({
    queryKey: ['organization_data', userId],
    queryFn: async () => {
      console.log('Fetching organization data for user:', userId);
      
      if (!session?.access_token) {
        throw new Error('No session found');
      }

      const { data, error } = await supabase.functions.invoke('get-organization-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching organization data:', error);
        throw error;
      }

      console.log('Organization data:', data);
      return data;
    },
    enabled: !!userId && !!session?.access_token && !!profile?.email && !isFreeDomain(getUserDomain(profile.email)),
  });

  if (profileLoading || (isLoading && !isFreeDomain(getUserDomain(profile?.email || '')))) {
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

  if (profile?.email && isFreeDomain(getUserDomain(profile.email))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Organizations can only be created or joined with a business email address. Your current email ({profile.email}) is from a free email provider.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!organizationData?.organization) {
    return (
      <CreateJoinOrganization 
        userId={userId} 
        onOrganizationUpdate={async () => {
          await queryClient.invalidateQueries({
            queryKey: ['organization_data', userId],
          });
        }} 
      />
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
            onPromoteUser={async (memberId: string) => {
              try {
                const { error } = await supabase
                  .from('organization_members')
                  .update({ role: 'admin' })
                  .eq('user_id', memberId)
                  .eq('organization_id', organizationData?.organization?.id);

                if (error) throw error;

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
            }}
            onRemoveUser={async (memberId: string) => {
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
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};