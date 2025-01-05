import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  onRetrieveMedia?: () => Promise<void>;
}

export function SharedVideoPlayer({ videoUrl, recordingUrl, onRetrieveMedia }: SharedVideoPlayerProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use video_url if available, fall back to recording_url
  const finalVideoUrl = videoUrl || recordingUrl;

  const handleError = async (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (onRetrieveMedia) {
      setIsRefreshing(true);
      try {
        await onRetrieveMedia();
        toast({
          title: "Video URL refreshed",
          description: "Please try playing the video again.",
        });
      } catch (error) {
        toast({
          title: "Error refreshing video",
          description: "Could not refresh the video URL. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
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
    <div className="relative">
      <video
        src={finalVideoUrl}
        controls
        className="w-full h-full rounded-lg"
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onError={handleError}
      >
        <source src={finalVideoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="text-white">Refreshing video URL...</div>
        </div>
      )}
    </div>
  );
}