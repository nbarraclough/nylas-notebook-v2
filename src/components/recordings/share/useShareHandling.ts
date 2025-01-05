import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toast } from "@/hooks/use-toast";

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
  toast: Toast;
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
  toast
}: UseShareHandlingProps) {
  const handleShare = async () => {
    try {
      setIsLoading(true);

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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (isInternalEnabled && profile?.organization_id) {
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

      if (isExternalEnabled) {
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
            password: isPasswordEnabled ? password : null
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

      onSuccess();
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

  return {
    handleShare,
    handleCopyLink
  };
}