import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface OrganizationShareProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  recordingId?: string;
}

export function OrganizationShare({ isEnabled, onToggle, recordingId }: OrganizationShareProps) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!recordingId) return;
    
    const libraryDeepLink = `${window.location.origin}/library/${recordingId}`;
    
    try {
      await navigator.clipboard.writeText(libraryDeepLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "Link copied",
        description: "The organization sharing link has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the link manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
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
      
      {isEnabled && recordingId && (
        <div className="flex gap-2">
          <Input 
            readOnly 
            value={`${window.location.origin}/library/${recordingId}`}
            className="text-sm"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handleCopyLink}
            className="shrink-0"
          >
            {isCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}