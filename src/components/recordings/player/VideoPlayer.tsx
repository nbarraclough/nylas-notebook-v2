import { useEffect, useRef } from "react";
import { BaseVideoPlayer } from "./BaseVideoPlayer";
import { useRecordingMedia } from "@/hooks/use-recording-media";
import { Loader2 } from "lucide-react";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerProps {
  recordingId: string;
  videoUrl: string | null;
  recordingUrl: string | null;
  title: string;
  participants: EventParticipant[];
  grantId?: string | null;
  notetakerId?: string | null;
}

export const VideoPlayer = ({
  recordingId,
  videoUrl,
  recordingUrl,
  title,
  participants,
  grantId,
  notetakerId
}: VideoPlayerProps) => {
  const playerRef = useRef(null);
  const { isRefreshing, refreshMedia } = useRecordingMedia(recordingId);

  const handleRefreshMedia = async () => {
    if (notetakerId && grantId) {
      await refreshMedia(recordingId, notetakerId);
    }
  };

  // Get Mux playback URL if available
  const getMuxPlaybackUrl = (url: string) => {
    if (url.includes('mux.com')) {
      return url;
    }
    // If it's a Mux playback ID, construct the URL
    if (url.startsWith('https://stream.mux.com')) {
      return url;
    }
    return url;
  };

  const videoSource = videoUrl ? getMuxPlaybackUrl(videoUrl) : recordingUrl;

  return (
    <div className="relative aspect-video">
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Refreshing video...</p>
          </div>
        </div>
      )}
      <BaseVideoPlayer
        ref={playerRef}
        videoUrl={videoSource}
        recordingUrl={recordingUrl}
        onRefreshMedia={handleRefreshMedia}
        isRefreshing={isRefreshing}
      />
    </div>
  );
};