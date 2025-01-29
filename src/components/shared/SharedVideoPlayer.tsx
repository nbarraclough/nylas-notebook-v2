import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";

interface SharedVideoPlayerProps {
  recordingId: string;
  notetakerId?: string | null;
  muxPlaybackId?: string | null;
}

export const SharedVideoPlayer = forwardRef<BaseVideoPlayerRef, SharedVideoPlayerProps>(({ 
  muxPlaybackId
}, ref) => {
  if (!muxPlaybackId) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
        Video not available
      </div>
    );
  }

  return (
    <BaseVideoPlayer
      ref={ref}
      muxPlaybackId={muxPlaybackId}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";