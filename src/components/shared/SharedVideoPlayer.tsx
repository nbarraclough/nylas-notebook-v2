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
  // Only use Mux playback URL
  const getMuxPlaybackUrl = (playbackId: string) => {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  };

  const videoSource = muxPlaybackId ? getMuxPlaybackUrl(muxPlaybackId) : null;

  console.log('SharedVideoPlayer initialized with:', {
    muxPlaybackId,
    videoSource
  });

  return (
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoSource}
      recordingUrl={null}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";