
import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useVideoDownload } from "@/hooks/use-video-download";

interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  recordingId: string;
  notetakerId?: string | null;
  muxPlaybackId?: string | null;
  title?: string;
}

export const SharedVideoPlayer = forwardRef<BaseVideoPlayerRef, SharedVideoPlayerProps>(({ 
  muxPlaybackId,
  title = 'Recording'
}, ref) => {
  const { isDownloading, downloadVideo } = useVideoDownload();

  if (!muxPlaybackId) {
    return (
      <div className={cn(
        "w-full h-full flex items-center justify-center",
        "bg-gray-100 dark:bg-gray-800",
        "text-gray-500 dark:text-gray-400",
        "rounded-lg border border-gray-200 dark:border-gray-700"
      )}>
        <p className="text-center">
          <span className="block font-medium mb-1">Video not available</span>
          <span className="text-sm opacity-75">The recording could not be loaded</span>
        </p>
      </div>
    );
  }

  const videoSource = `https://stream.mux.com/${muxPlaybackId}.m3u8`;

  return (
    <div className="relative">
      <BaseVideoPlayer
        ref={ref}
        videoUrl={videoSource}
        recordingUrl={null}
      />
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
    </div>
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";
