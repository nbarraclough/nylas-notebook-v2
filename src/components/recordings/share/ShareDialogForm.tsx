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
      console.log('Fetching profile data for share dialog');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('share_internal_recordings, organization_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile data:', data);
      return data;
    },
  });

  // Fetch existing shares when the dialog opens
  const { data: existingShares } = useQuery({
    queryKey: ['shares', recordingId],
    queryFn: async () => {
      console.log('Fetching existing shares for recording:', recordingId);
      const { data: shares, error } = await supabase
        .from('video_shares')
        .select('*')
        .eq('recording_id', recordingId);

      if (error) {
        console.error('Error fetching shares:', error);
        throw error;
      }

      console.log('Existing shares:', shares);
      return shares;
    },
  });

  // Set initial states based on existing shares and user preferences
  useEffect(() => {
    console.log('Setting initial states with profile:', profile, 'and shares:', existingShares);
    
    if (existingShares) {
      const internalShare = existingShares.find(share => share.share_type === 'internal');
      const externalShare = existingShares.find(share => share.share_type === 'external');

      setIsInternalEnabled(!!internalShare);
      setIsExternalEnabled(!!externalShare);
      
      if (externalShare) {
        const shareUrl = `${window.location.origin}/shared/${externalShare.external_token}`;
        setExternalShareUrl(shareUrl);
        setIsPasswordEnabled(!!externalShare.password);
        setPassword(externalShare.password || '');
      }
    }
  }, [existingShares, profile]);

  const handleShare = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Remove existing shares
      const { error: deleteError } = await supabase
        .from('video_shares')
        .delete()
        .eq('recording_id', recordingId);

      if (deleteError) throw deleteError;

      // Create internal share if enabled
      if (isInternalEnabled && profile?.organization_id) {
        const { error: internalError } = await supabase
          .from('video_shares')
          .insert({
            recording_id: recordingId,
            shared_by: user.id,
            organization_id: profile.organization_id,
            share_type: 'internal'
          });

        if (internalError) throw internalError;
      }

      // Create external share if enabled
      if (isExternalEnabled) {
        const { data: newShare, error: externalError } = await supabase
          .from('video_shares')
          .insert({
            recording_id: recordingId,
            shared_by: user.id,
            share_type: 'external',
            password: isPasswordEnabled ? password : null
          })
          .select('external_token')
          .single();

        if (externalError) throw externalError;
        if (!newShare) throw new Error('Failed to create share');

        const shareUrl = `${window.location.origin}/shared/${newShare.external_token}`;
        setExternalShareUrl(shareUrl);
      } else {
        setExternalShareUrl(null);
      }

      toast({
        title: "Sharing settings updated",
        description: "Your sharing preferences have been saved successfully."
      });

      onSuccess();
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: "Error sharing video",
        description: "There was a problem updating the sharing settings. Please try again.",
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
        recordingId={recordingId}
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
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? "Saving..." : "Save Sharing Settings"}
      </Button>
    </div>
  );
}