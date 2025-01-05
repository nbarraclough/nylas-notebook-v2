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

// Move share handling logic to a separate hook
import { useShareHandling } from "./useShareHandling";

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
      console.log('Using profile preference:', profile.share_internal_recordings);
      setIsInternalEnabled(profile.share_internal_recordings || false);
    }
  }, [existingShares, profile]);

  // Use the extracted share handling logic
  const { handleShare, handleCopyLink } = useShareHandling({
    recordingId,
    isInternalEnabled,
    isExternalEnabled,
    isPasswordEnabled,
    password,
    externalShareUrl,
    setExternalShareUrl,
    setIsCopied,
    setIsLoading,
    onSuccess
  });

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