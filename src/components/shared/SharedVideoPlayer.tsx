import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  recordingId: string;
  notetakerId?: string | null;
  onRefreshMedia?: (recordingId: string, notetakerId: string | null) => Promise<void>;
  isRefreshing?: boolean;
}

export function SharedVideoPlayer({ 
  videoUrl, 
  recordingUrl, 
  recordingId, 
  notetakerId,
  onRefreshMedia,
  isRefreshing 
}: SharedVideoPlayerProps) {
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Use video_url if available, fall back to recording_url
  const finalVideoUrl = videoUrl || recordingUrl;

  useEffect(() => {
    // When the video URL changes and isn't refreshing, attempt to play
    if (finalVideoUrl && !isRefreshing && videoRef.current) {
      videoRef.current.play().catch(e => {
        console.log('Autoplay prevented:', e);
      });
    }
  }, [finalVideoUrl, isRefreshing]);

  const handleError = async () => {
    if (onRefreshMedia) {
      await onRefreshMedia(recordingId, notetakerId);
    }
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
    // Attempt autoplay when video is loaded
    if (videoRef.current) {
      videoRef.current.play().catch(e => {
        console.log('Autoplay prevented:', e);
      });
    }
  };

  if (!finalVideoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">This video is no longer available or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={finalVideoUrl}
        controls
        autoPlay
        className="w-full h-full rounded-lg"
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onError={handleError}
        onLoadedData={handleLoadedData}
      >
        <source src={finalVideoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}