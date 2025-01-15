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
  isLoading?: boolean;
}

export type VideoPlayerRef = BaseVideoPlayerRef;

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  recordingId,
  videoUrl,
  recordingUrl,
  muxPlaybackId,
  isLoading,
}, ref) => {
  // Get Mux playback URL if available
  const getMuxPlaybackUrl = (playbackId: string) => {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  };

  const videoSource = muxPlaybackId 
    ? getMuxPlaybackUrl(muxPlaybackId)
    : videoUrl || recordingUrl;

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden transition-all duration-200 group hover:shadow-lg hover:shadow-[#9b87f5]/10">
      <BaseVideoPlayer
        ref={ref}
        videoUrl={videoSource}
        recordingUrl={recordingUrl}
        isRefreshing={isLoading}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";