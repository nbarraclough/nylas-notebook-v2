import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OrganizationShare } from "./share/OrganizationShare";
import { PublicLinkShare } from "./share/PublicLinkShare";

interface ShareVideoDialogProps {
  recordingId: string;
}

export function ShareVideoDialog({ recordingId }: ShareVideoDialogProps) {
  const { toast } = useToast();
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
    try {
      setIsLoading(true);

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to share recordings.",
          variant: "destructive"
        });
        return;
      }

      if (!isInternalEnabled && !isExternalEnabled) {
        toast({
          title: "Select sharing option",
          description: "Please select at least one sharing option.",
          variant: "destructive"
        });
        return;
      }

      // Get current user's organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Handle internal organization sharing
      if (isInternalEnabled && profile?.organization_id) {
        // Check if internal share already exists
        const { data: existingShare, error: checkError } = await supabase
          .from('video_shares')
          .select('id')
          .match({
            recording_id: recordingId,
            share_type: 'internal',
            organization_id: profile.organization_id
          })
          .maybeSingle();

        if (checkError) throw checkError;

        if (!existingShare) {
          const { error: internalError } = await supabase
            .from('video_shares')
            .insert({
              recording_id: recordingId,
              share_type: 'internal',
              organization_id: profile.organization_id,
              shared_by: session.user.id
            });

          if (internalError) throw internalError;
        }

        toast({
          title: "Shared with organization",
          description: "The recording has been shared with your organization."
        });
      }

      // Handle external sharing with public link
      if (isExternalEnabled) {
        // Check if external share already exists
        const { data: existingShare, error: checkError } = await supabase
          .from('video_shares')
          .select('external_token')
          .match({
            recording_id: recordingId,
            share_type: 'external'
          })
          .maybeSingle();

        if (checkError) throw checkError;

        let externalToken;

        if (existingShare) {
          externalToken = existingShare.external_token;
        } else {
          const shareData = {
            recording_id: recordingId,
            share_type: 'external',
            shared_by: session.user.id,
            password: isPasswordEnabled ? password : null,
            expires_at: isExpiryEnabled ? expiryDate?.toISOString() : null
          };

          const { data: newShare, error: externalError } = await supabase
            .from('video_shares')
            .insert(shareData)
            .select('external_token')
            .maybeSingle();

          if (externalError) throw externalError;
          if (!newShare) throw new Error('Failed to create share');
          
          externalToken = newShare.external_token;
        }

        if (externalToken) {
          const shareUrl = `${window.location.origin}/shared/${externalToken}`;
          setExternalShareUrl(shareUrl);
          toast({
            title: "Public link created",
            description: "The public sharing link has been created successfully."
          });
        }
      }

      setIsOpen(false);
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
            disabled={(!isInternalEnabled && !isExternalEnabled) || isLoading}
            className="w-full"
          >
            {isLoading ? "Sharing..." : "Share Recording"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}