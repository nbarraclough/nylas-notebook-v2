import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MembersList } from "./MembersList";
import { OrganizationInfo } from "./OrganizationInfo";

interface OrganizationSettingsContentProps {
  organization: any;
  members: any[];
  userId: string;
  onOrganizationUpdate: () => Promise<void>;
}

export const OrganizationSettingsContent = ({ 
  organization, 
  members, 
  userId,
  onOrganizationUpdate 
}: OrganizationSettingsContentProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = members.some(
    member => member.user_id === userId && member.role === 'admin'
  );

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
          <MembersList
            members={members}
            currentUserId={userId}
            isAdmin={isAdmin}
            onPromoteUser={async (memberId: string) => {
              try {
                const { error } = await supabase
                  .from('organization_members')
                  .update({ role: 'admin' })
                  .eq('user_id', memberId)
                  .eq('organization_id', organization.id);

                if (error) throw error;

                await onOrganizationUpdate();

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
                  .eq('organization_id', organization.id);

                if (memberError) throw memberError;

                const { error: profileError } = await supabase
                  .from('profiles')
                  .update({ organization_id: null })
                  .eq('id', memberId);

                if (profileError) throw profileError;

                await onOrganizationUpdate();

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