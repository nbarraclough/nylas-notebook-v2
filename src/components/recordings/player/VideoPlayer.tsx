import { forwardRef } from "react";
import { useRecordingMedia } from "@/hooks/use-recording-media";
import type { EventParticipant } from "@/types/calendar";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./BaseVideoPlayer";

interface VideoPlayerProps {
  recordingId: string;
  videoUrl: string | null;
  recordingUrl: string | null;
  title: string;
  participants: EventParticipant[];
  grantId: string | null;
  notetakerId?: string | null;
  onRefreshMedia?: () => Promise<void>;
}

export type VideoPlayerRef = BaseVideoPlayerRef;

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  recordingId,
  videoUrl,
  recordingUrl,
  notetakerId,
  onRefreshMedia
}, ref) => {
  const { refreshMedia } = useRecordingMedia();

  const handleRefreshMedia = async () => {
    if (onRefreshMedia) {
      await onRefreshMedia();
    } else if (notetakerId) {
      await refreshMedia(recordingId, notetakerId);
    }
  };

  return (
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoUrl}
      recordingUrl={recordingUrl}
      onRefreshMedia={handleRefreshMedia}
    />
  );
});

VideoPlayer.displayName = "VideoPlayer";