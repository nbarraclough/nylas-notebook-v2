
import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./BaseVideoPlayer";
import type { EventParticipant } from "@/types/calendar";
import { cn } from "@/lib/utils";

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
  videoUrl,
  recordingUrl,
  muxPlaybackId
}, ref) => {
  // Get Mux playback URL if not provided directly
  const effectiveVideoUrl = videoUrl || (muxPlaybackId ? `https://stream.mux.com/${muxPlaybackId}.m3u8` : null);

  // Only render if we have a video URL
  if (!effectiveVideoUrl && !recordingUrl) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
        Video not available
      </div>
    );
  }

  return (
    <div className="relative aspect-video">
      <BaseVideoPlayer
        ref={ref}
        videoUrl={effectiveVideoUrl}
        recordingUrl={recordingUrl}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
