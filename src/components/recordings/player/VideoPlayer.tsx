import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./BaseVideoPlayer";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerProps {
  recordingId: string;
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

  return (
    <div className="relative aspect-video">
      <BaseVideoPlayer
        ref={ref}
        muxPlaybackId={muxPlaybackId}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";