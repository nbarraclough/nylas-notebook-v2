import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";

interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  recordingId: string;
  notetakerId?: string | null;
  onRefreshMedia?: (recordingId: string, notetakerId: string | null) => Promise<void>;
  isRefreshing?: boolean;
}

export const SharedVideoPlayer = forwardRef<BaseVideoPlayerRef, SharedVideoPlayerProps>(({ 
  videoUrl, 
  recordingUrl, 
  recordingId, 
  notetakerId,
  onRefreshMedia,
  isRefreshing 
}, ref) => {
  const handleRefreshMedia = async () => {
    if (onRefreshMedia) {
      await onRefreshMedia(recordingId, notetakerId);
    }
  };

  // Get Mux playback URL if available
  const getMuxPlaybackUrl = (url: string) => {
    if (url.includes('mux.com')) {
      return url;
    }
    // If it's a Mux playback ID, construct the URL
    if (url.startsWith('https://stream.mux.com')) {
      return url;
    }
    return url;
  };

  const videoSource = videoUrl ? getMuxPlaybackUrl(videoUrl) : recordingUrl;

  return (
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoSource}
      recordingUrl={recordingUrl}
      onRefreshMedia={handleRefreshMedia}
      isRefreshing={isRefreshing}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";