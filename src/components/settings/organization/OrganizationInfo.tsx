import { Label } from "@/components/ui/label";
import { TeamInvite } from "@/components/dashboard/welcome/TeamInvite";

interface OrganizationInfoProps {
  name: string;
  domain: string;
  userRole: string;
}

export const OrganizationInfo = ({ 
  name, 
  domain, 
  userRole,
}: OrganizationInfoProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="space-y-1">
          <Label>Organization Name</Label>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <div>
          <Label>Domain</Label>
          <p className="text-sm text-muted-foreground">{domain}</p>
        </div>
        <div>
          <Label>Role</Label>
          <p className="text-sm text-muted-foreground">
            {userRole === 'admin' ? 'Admin' : 'Member'}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <TeamInvite />
      </div>
    </div>
  );
};