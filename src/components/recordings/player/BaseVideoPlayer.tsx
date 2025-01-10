import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from "react";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface BaseVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  onRefreshMedia?: () => Promise<void>;
  isRefreshing?: boolean;
}

export interface BaseVideoPlayerRef {
  pause: () => void;
  getCurrentTime: () => number;
  seekTo: (time: number) => void;
}

const MAX_RETRIES = 3;
const MEMORY_LIMIT = 2000 * 1024 * 1024; // 2GB limit for safety

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({ 
  videoUrl: initialVideoUrl,
  recordingUrl,
  onRefreshMedia,
  isRefreshing
}, ref) => {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    pause: () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
    },
    getCurrentTime: () => {
      return videoElement?.currentTime || 0;
    },
    seekTo: (time: number) => {
      if (videoElement) {
        videoElement.currentTime = time;
      }
    }
  }));

  const cleanupBlobUrl = useCallback(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [blobUrl]);

  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoElement || !progressBarRef.current) return;
    setIsDragging(true);
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    videoElement.currentTime = position * videoElement.duration;
  };

  const handleSeeking = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !videoElement || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoElement.currentTime = position * videoElement.duration;
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const downloadVideo = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cancel any existing download
      cancelDownload();
      
      // Create new abort controller for this download
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Failed to fetch video');
      
      const contentLength = Number(response.headers.get('Content-Length')) || 0;
      
      // Check file size
      if (contentLength > MEMORY_LIMIT) {
        throw new Error('Video file is too large for in-memory playback');
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to initialize video download');

      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress
        const progress = Math.round((receivedLength / contentLength) * 100);
        setLoadingProgress(progress);

        // Check if we're exceeding memory limits
        if (receivedLength > MEMORY_LIMIT) {
          throw new Error('Memory limit exceeded during download');
        }
      }

      const blob = new Blob(chunks, { type: 'video/webm' });
      cleanupBlobUrl();
      const newBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(newBlobUrl);
      setIsLoading(false);
      setRetryCount(0); // Reset retry count on success
      
      // Clear the abort controller
      abortControllerRef.current = null;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Download cancelled');
        return;
      }

      console.error('Error downloading video:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download video';
      setError(errorMessage);
      setIsLoading(false);

      // Handle retries
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Download failed",
          description: `Retrying... (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
        });
        await downloadVideo(url);
      } else if (onRefreshMedia) {
        await onRefreshMedia();
      }
    }
  }, [cleanupBlobUrl, onRefreshMedia, retryCount, toast, cancelDownload]);

  useEffect(() => {
    if (videoUrl && !blobUrl && !isLoading) {
      downloadVideo(videoUrl);
    }
  }, [videoUrl, blobUrl, isLoading, downloadVideo]);

  useEffect(() => {
    setVideoUrl(initialVideoUrl);
  }, [initialVideoUrl]);

  useEffect(() => {
    document.addEventListener('mouseup', handleSeekEnd);
    document.addEventListener('mouseleave', handleSeekEnd);

    return () => {
      cleanupBlobUrl();
      cancelDownload();
      document.removeEventListener('mouseup', handleSeekEnd);
      document.removeEventListener('mouseleave', handleSeekEnd);
    };
  }, [cleanupBlobUrl, cancelDownload]);

  if (error) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-muted-foreground max-w-[80%] mx-auto">{error}</p>
          <Button 
            variant="outline"
            onClick={() => {
              setRetryCount(0);
              downloadVideo(videoUrl || '');
            }}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!blobUrl && isLoading) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="text-center space-y-4 w-full max-w-[80%]">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <Progress value={loadingProgress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Downloading video... {loadingProgress}%
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={cancelDownload}
          >
            Cancel
          </Button>
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
    <div className="aspect-video relative">
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
      
      <div 
        ref={progressBarRef}
        className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 cursor-pointer"
        onMouseDown={handleSeekStart}
        onMouseMove={handleSeeking}
      >
        {videoElement && (
          <div 
            className="h-full bg-primary transition-all duration-100"
            style={{ 
              width: `${(videoElement.currentTime / videoElement.duration) * 100}%` 
            }}
          />
        )}
      </div>
    </div>
  );
});

BaseVideoPlayer.displayName = "BaseVideoPlayer";
