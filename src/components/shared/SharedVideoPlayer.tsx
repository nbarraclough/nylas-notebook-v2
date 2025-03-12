
import { forwardRef } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";
import { cn } from "@/lib/utils";

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
    <BaseVideoPlayer
      ref={ref}
      videoUrl={videoSource}
      recordingUrl={null}
      muxPlaybackId={muxPlaybackId}
      title={title}
    />
  );
});

SharedVideoPlayer.displayName = "SharedVideoPlayer";
