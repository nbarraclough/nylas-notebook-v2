import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from "react";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({ 
  videoUrl: initialVideoUrl,
  recordingUrl,
  onRefreshMedia,
  isRefreshing
}, ref) => {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const verifyVideoUrl = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Verifying video URL:', url);
      
      const { data, error: proxyError } = await supabase.functions.invoke('proxy-video-download', {
        body: { url },
      });

      if (proxyError) throw proxyError;

      console.log('Video URL verified:', data);
      return data.url;
    } catch (err) {
      console.error('Error verifying video:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify video';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    if (videoUrl) {
      verifyVideoUrl(videoUrl).catch(() => {
        if (onRefreshMedia) {
          onRefreshMedia();
        }
      });
    }
  }, [videoUrl, verifyVideoUrl, onRefreshMedia]);

  useEffect(() => {
    setVideoUrl(initialVideoUrl);
  }, [initialVideoUrl]);

  useEffect(() => {
    document.addEventListener('mouseup', handleSeekEnd);
    document.addEventListener('mouseleave', handleSeekEnd);

    return () => {
      document.removeEventListener('mouseup', handleSeekEnd);
      document.removeEventListener('mouseleave', handleSeekEnd);
    };
  }, []);

  if (error) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-muted-foreground max-w-[80%] mx-auto">{error}</p>
          <Button 
            variant="outline"
            onClick={() => {
              if (videoUrl) {
                verifyVideoUrl(videoUrl);
              }
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

  if (!videoUrl && !recordingUrl) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">This video is no longer available or has been removed.</p>
      </div>
    );
  }

  const finalVideoUrl = videoUrl || recordingUrl;

  if (!finalVideoUrl) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No video URL available.</p>
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