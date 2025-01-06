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

  return (
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoUrl}
      recordingUrl={recordingUrl}
      onRefreshMedia={handleRefreshMedia}
      isRefreshing={isRefreshing}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";