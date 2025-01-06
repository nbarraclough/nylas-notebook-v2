import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  recordingId: string;
  notetakerId?: string | null;
}

export function SharedVideoPlayer({ videoUrl, recordingUrl, recordingId, notetakerId }: SharedVideoPlayerProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use video_url if available, fall back to recording_url
  const finalVideoUrl = videoUrl || recordingUrl;

  const refreshMedia = async () => {
    if (!recordingId) {
      console.error('Missing recordingId for refreshMedia');
      toast({
        title: "Error",
        description: "Could not refresh video: missing recording ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('Refreshing media for recording:', recordingId, 'notetakerId:', notetakerId);
      
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId: notetakerId || undefined
        },
      });

      if (error) {
        console.error('Error refreshing media:', error);
        toast({
          title: "Error",
          description: "Failed to refresh video. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Reload the page to get the updated URLs
      window.location.reload();
      
      toast({
        title: "Success",
        description: "Video refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing media:', error);
      toast({
        title: "Error",
        description: "Failed to refresh video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleError = async (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    await refreshMedia();
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
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Refreshing video...</p>
          </div>
        </div>
      )}
    </div>
  );
}