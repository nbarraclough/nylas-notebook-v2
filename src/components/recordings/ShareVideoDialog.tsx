import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

interface ShareVideoDialogProps {
  recordingId: string;
}

export function ShareVideoDialog({ recordingId }: ShareVideoDialogProps) {
  const { toast } = useToast();
  const session = useSession();
  const [isInternalEnabled, setIsInternalEnabled] = useState(false);
  const [isExternalEnabled, setIsExternalEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [externalShareUrl, setExternalShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      // Get current user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (isInternalEnabled) {
        await supabase.from('video_shares').insert({
          recording_id: recordingId,
          share_type: 'internal',
          organization_id: profile?.organization_id,
          shared_by: session.user.id
        });
      }

      if (isExternalEnabled) {
        const { data: shareData } = await supabase.from('video_shares').insert({
          recording_id: recordingId,
          share_type: 'external',
          shared_by: session.user.id
        }).select('external_token').single();

        if (shareData?.external_token) {
          const shareUrl = `${window.location.origin}/shared/${shareData.external_token}`;
          setExternalShareUrl(shareUrl);
        }
      }

      toast({
        title: "Video shared successfully",
        description: "The sharing settings have been updated."
      });
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: "Error sharing video",
        description: "There was a problem updating the sharing settings.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!externalShareUrl) return;
    
    try {
      await navigator.clipboard.writeText(externalShareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "Link copied",
        description: "The sharing link has been copied to your clipboard."
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
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Recording</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Share with Organization</Label>
              <p className="text-sm text-muted-foreground">
                Make this recording available to everyone in your organization
              </p>
            </div>
            <Switch
              checked={isInternalEnabled}
              onCheckedChange={setIsInternalEnabled}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Create Public Link</Label>
              <p className="text-sm text-muted-foreground">
                Generate a link that can be shared with anyone
              </p>
            </div>
            <Switch
              checked={isExternalEnabled}
              onCheckedChange={setIsExternalEnabled}
            />
          </div>

          {externalShareUrl && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <input
                type="text"
                value={externalShareUrl}
                readOnly
                className="flex-1 bg-transparent border-none focus:outline-none text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
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

          <Button 
            onClick={handleShare} 
            disabled={!isInternalEnabled && !isExternalEnabled || isLoading}
            className="w-full"
          >
            {isLoading ? "Sharing..." : "Share Recording"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}