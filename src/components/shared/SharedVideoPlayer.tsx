
import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";

interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
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

  const videoSource = `https://stream.mux.com/${muxPlaybackId}.m3u8`;

  return (
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoSource}
      recordingUrl={null}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";
