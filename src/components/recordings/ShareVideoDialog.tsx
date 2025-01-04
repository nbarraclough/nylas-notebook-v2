import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";
import { OrganizationShare } from "./share/OrganizationShare";
import { PublicLinkShare } from "./share/PublicLinkShare";

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
  const [password, setPassword] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);
  const [isExpiryEnabled, setIsExpiryEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      // Get current user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (isInternalEnabled && profile?.organization_id) {
        await supabase.from('video_shares').insert({
          recording_id: recordingId,
          share_type: 'internal',
          organization_id: profile.organization_id,
          shared_by: session.user.id
        });

        toast({
          title: "Shared with organization",
          description: "The recording has been shared with your organization."
        });
      }

      if (isExternalEnabled) {
        const shareData = {
          recording_id: recordingId,
          share_type: 'external',
          shared_by: session.user.id,
          password: isPasswordEnabled ? password : null,
          expires_at: isExpiryEnabled ? expiryDate?.toISOString() : null
        };

        const { data: newShare, error } = await supabase
          .from('video_shares')
          .insert(shareData)
          .select('external_token')
          .single();

        if (error) throw error;

        if (newShare?.external_token) {
          const shareUrl = `${window.location.origin}/shared/${newShare.external_token}`;
          setExternalShareUrl(shareUrl);
          toast({
            title: "Public link created",
            description: "The public sharing link has been created successfully."
          });
        }
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: "Error sharing video",
        description: "There was a problem sharing the video. Please try again.",
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <OrganizationShare
            isEnabled={isInternalEnabled}
            onToggle={setIsInternalEnabled}
          />
          
          <PublicLinkShare
            isEnabled={isExternalEnabled}
            onToggle={setIsExternalEnabled}
            isPasswordEnabled={isPasswordEnabled}
            onPasswordToggle={setIsPasswordEnabled}
            password={password}
            onPasswordChange={setPassword}
            isExpiryEnabled={isExpiryEnabled}
            onExpiryToggle={setIsExpiryEnabled}
            expiryDate={expiryDate}
            onExpiryDateChange={setExpiryDate}
            publicUrl={externalShareUrl}
            onCopyLink={handleCopyLink}
            isCopied={isCopied}
          />

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