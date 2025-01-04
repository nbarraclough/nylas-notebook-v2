import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface OrganizationShareProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function OrganizationShare({ isEnabled, onToggle }: OrganizationShareProps) {
  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="space-y-0.5">
        <Label>Share with Organization</Label>
        <p className="text-sm text-muted-foreground">
          Make this recording available to everyone in your organization
        </p>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
}