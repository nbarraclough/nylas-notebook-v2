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
  videoUrl, 
  recordingUrl,
  muxPlaybackId
}, ref) => {
  // Get Mux playback URL if available
  const getMuxPlaybackUrl = (playbackId: string) => {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  };

  const videoSource = muxPlaybackId 
    ? getMuxPlaybackUrl(muxPlaybackId)
    : videoUrl || recordingUrl;

  return (
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoSource}
      recordingUrl={recordingUrl}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";