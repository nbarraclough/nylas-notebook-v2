import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Loader2 } from "lucide-react";

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    pause: () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    }
  }));

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [blobUrl]);

  const downloadVideo = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch video');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to initialize video download');

      const contentLength = Number(response.headers.get('Content-Length')) || 0;
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        setLoadingProgress(Math.round((receivedLength / contentLength) * 100));
      }

      const blob = new Blob(chunks, { type: 'video/webm' });
      cleanupBlobUrl();
      const newBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(newBlobUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Error downloading video:', err);
      setError(err instanceof Error ? err.message : 'Failed to download video');
      setIsLoading(false);
      if (onRefreshMedia) {
        await onRefreshMedia();
      }
    }
  }, [cleanupBlobUrl, onRefreshMedia]);

  useEffect(() => {
    if (videoUrl && !blobUrl && !isLoading) {
      downloadVideo(videoUrl);
    }
  }, [videoUrl, blobUrl, isLoading, downloadVideo]);

  useEffect(() => {
    setVideoUrl(initialVideoUrl);
  }, [initialVideoUrl]);

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, [cleanupBlobUrl]);

  if (error) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => downloadVideo(videoUrl || '')}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!blobUrl && isLoading) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            Downloading video... {loadingProgress}%
          </p>
        </div>
      </div>
    );
  }

  const finalVideoUrl = blobUrl || videoUrl || recordingUrl;

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
      >
        <source src={finalVideoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

BaseVideoPlayer.displayName = "BaseVideoPlayer";