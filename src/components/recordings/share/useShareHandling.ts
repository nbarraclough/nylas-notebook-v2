import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit } from "@/utils/rateLimit";
import { logAuditEvent, AuditAction } from "@/utils/auditLogger";

interface UseShareHandlingProps {
  recordingId: string;
  isInternalEnabled: boolean;
  isExternalEnabled: boolean;
  isPasswordEnabled: boolean;
  password: string;
  externalShareUrl: string | null;
  setExternalShareUrl: (url: string | null) => void;
  setIsCopied: (copied: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  onSuccess: () => void;
}

export function useShareHandling({
  recordingId,
  isInternalEnabled,
  isExternalEnabled,
  isPasswordEnabled,
  password,
  externalShareUrl,
  setExternalShareUrl,
  setIsCopied,
  setIsLoading,
  onSuccess,
}: UseShareHandlingProps) {
  const { toast } = useToast();
  const [shareAttempts, setShareAttempts] = useState(0);

  const handleShare = async () => {
    try {
      // Rate limiting check
      const identifier = `share_${recordingId}`;
      if (!checkRateLimit(identifier)) {
        toast({
          title: "Too many attempts",
          description: "Please wait a moment before trying again.",
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);
      setShareAttempts(prev => prev + 1);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to share recordings.",
          variant: "destructive"
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Remove existing shares
      const { error: deleteError } = await supabase
        .from('video_shares')
        .delete()
        .eq('recording_id', recordingId);

      if (deleteError) throw deleteError;

      // Log the share attempt
      await logAuditEvent({
        action: AuditAction.VIDEO_SHARE,
        userId: session.user.id,
        details: {
          recordingId,
          isInternal: isInternalEnabled,
          isExternal: isExternalEnabled,
          hasPassword: isPasswordEnabled
        }
      });

      if (isInternalEnabled && profile?.organization_id) {
        const { error: internalError } = await supabase
          .from('video_shares')
          .insert({
            recording_id: recordingId,
            share_type: 'internal',
            organization_id: profile.organization_id,
            shared_by: session.user.id
          });

        if (internalError) throw internalError;

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
          password: isPasswordEnabled ? password : null
        };

        const { data: newShare, error: externalError } = await supabase
          .from('video_shares')
          .insert(shareData)
          .select('external_token')
          .maybeSingle();

        if (externalError) throw externalError;
        if (!newShare) throw new Error('Failed to create share');
        
        const shareUrl = `${window.location.origin}/shared/${newShare.external_token}`;
        setExternalShareUrl(shareUrl);
        toast({
          title: "Public link created",
          description: "The public sharing link has been created successfully."
        });
      } else {
        setExternalShareUrl(null);
      }

      onSuccess();
    } catch (error) {
      console.error('Error sharing video:', {
        type: 'share_error',
        recordingId
      });
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

  return {
    handleShare,
    handleCopyLink
  };
}