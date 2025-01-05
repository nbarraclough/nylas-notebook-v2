import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OrganizationShare } from "./OrganizationShare";
import { PublicLinkShare } from "./PublicLinkShare";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ShareDialogFormProps {
  recordingId: string;
  onSuccess: () => void;
}

export function ShareDialogForm({ recordingId, onSuccess }: ShareDialogFormProps) {
  const { toast } = useToast();
  const [isInternalEnabled, setIsInternalEnabled] = useState(false);
  const [isExternalEnabled, setIsExternalEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [externalShareUrl, setExternalShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);

  // Fetch user's profile to get sharing preferences
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('share_internal_recordings')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing shares when the dialog opens
  const { data: existingShares } = useQuery({
    queryKey: ['shares', recordingId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      const { data: shares, error } = await supabase
        .from('video_shares')
        .select('*')
        .eq('recording_id', recordingId);

      if (error) throw error;
      return shares;
    },
  });

  // Set initial states based on existing shares and user preferences
  useEffect(() => {
    if (existingShares) {
      const internalShare = existingShares.find(share => share.share_type === 'internal');
      const externalShare = existingShares.find(share => share.share_type === 'external');

      // If no existing internal share, use the user's preference
      setIsInternalEnabled(internalShare ? true : (profile?.share_internal_recordings || false));
      setIsExternalEnabled(!!externalShare);
      
      if (externalShare) {
        const shareUrl = `${window.location.origin}/shared/${externalShare.external_token}`;
        setExternalShareUrl(shareUrl);
        setIsPasswordEnabled(!!externalShare.password);
        setPassword(externalShare.password || '');
      }
    } else if (profile) {
      // If no existing shares, use the user's preference
      setIsInternalEnabled(profile.share_internal_recordings || false);
    }
  }, [existingShares, profile]);

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

  return (
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
  );
}
