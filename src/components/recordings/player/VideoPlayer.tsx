import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./BaseVideoPlayer";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerProps {
  recordingId: string;
  videoUrl: string | null;
  recordingUrl: string | null;
  title: string;
  participants: EventParticipant[];
  grantId?: string | null;
  notetakerId?: string | null;
  muxPlaybackId?: string | null;
}

export type VideoPlayerRef = BaseVideoPlayerRef;

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  recordingId,
  videoUrl,
  recordingUrl,
  muxPlaybackId,
}, ref) => {
  // Get Mux playback URL if available
  const getMuxPlaybackUrl = (playbackId: string) => {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  };

  const videoSource = muxPlaybackId 
    ? getMuxPlaybackUrl(muxPlaybackId)
    : videoUrl || recordingUrl;

  return (
    <div className="relative aspect-video">
      <BaseVideoPlayer
        ref={ref}
        videoUrl={videoSource}
        recordingUrl={recordingUrl}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";