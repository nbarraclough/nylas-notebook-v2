import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

interface BaseVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  onRefreshMedia?: () => Promise<void>;
  isRefreshing?: boolean;
}

export interface BaseVideoPlayerRef {
  pause: () => void;
}

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({ 
  videoUrl: initialVideoUrl,
  recordingUrl,
  onRefreshMedia,
  isRefreshing
}, ref) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => ({
    pause: () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0; // Reset to beginning
      }
    }
  }));

  useEffect(() => {
    setVideoUrl(initialVideoUrl);
    setIsLoaded(false);
  }, [initialVideoUrl]);

  useEffect(() => {
    // When the video URL changes and isn't refreshing, attempt to play
    if (videoUrl && !isRefreshing && videoElement) {
      videoElement.play().catch(e => {
        console.log('Autoplay prevented:', e);
      });
    }
  }, [videoUrl, isRefreshing]);

  const handlePlay = async () => {
    if (onRefreshMedia) {
      await onRefreshMedia();
    }
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
    // Attempt autoplay when video is loaded
    if (videoElement) {
      videoElement.play().catch(e => {
        console.log('Autoplay prevented:', e);
      });
    }
  };

  // Use video_url if available, fall back to recording_url
  const finalVideoUrl = videoUrl || recordingUrl;

  if (!finalVideoUrl) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">This video is no longer available or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="aspect-video">
      <video
        ref={setVideoElement}
        src={finalVideoUrl}
        controls
        autoPlay
        className="w-full h-full"
        playsInline
        preload="auto"
        controlsList="nodownload"
        onPlay={handlePlay}
        onLoadedData={handleLoadedData}
      >
        <source src={finalVideoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

BaseVideoPlayer.displayName = "BaseVideoPlayer";