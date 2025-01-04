import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface PublicLinkShareProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  isPasswordEnabled: boolean;
  onPasswordToggle: (enabled: boolean) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  publicUrl: string | null;
  onCopyLink: () => void;
  isCopied: boolean;
}

export function PublicLinkShare({
  isEnabled,
  onToggle,
  isPasswordEnabled,
  onPasswordToggle,
  password,
  onPasswordChange,
  publicUrl,
  onCopyLink,
  isCopied,
}: PublicLinkShareProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label>Create Public Link</Label>
          <p className="text-sm text-muted-foreground">
            Generate a link that can be shared with anyone
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
        />
      </div>

      {isEnabled && (
        <div className="space-y-4 pl-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Password Protection</Label>
              <p className="text-sm text-muted-foreground">
                Require a password to view the recording
              </p>
            </div>
            <Switch
              checked={isPasswordEnabled}
              onCheckedChange={onPasswordToggle}
            />
          </div>

          {isPasswordEnabled && (
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          )}
        </div>
      )}

      {publicUrl && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            className="flex items-center gap-2"
          >
            {isCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {isCopied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  );
}