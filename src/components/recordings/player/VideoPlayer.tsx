
import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./BaseVideoPlayer";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useVideoDownload } from "@/hooks/use-video-download";
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
  muxPlaybackId,
  title
}, ref) => {
  const { isDownloading, downloadVideo } = useVideoDownload();

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
      {muxPlaybackId && (
        <div className="absolute top-4 right-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadVideo(muxPlaybackId, title)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2">Download</span>
          </Button>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
