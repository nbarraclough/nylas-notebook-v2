
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
  muxPlaybackId,
}, ref) => {
  // Only render if we have a Mux playback ID
  if (!muxPlaybackId) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
        Video not available
      </div>
    );
  }

  // Get Mux playback URL
  const videoSource = `https://stream.mux.com/${muxPlaybackId}.m3u8`;

  return (
    <div className="relative aspect-video">
      <BaseVideoPlayer
        ref={ref}
        videoUrl={videoSource}
        recordingUrl={null}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
