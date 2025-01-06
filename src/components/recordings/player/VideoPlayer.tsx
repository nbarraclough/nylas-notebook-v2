import { useState, useEffect } from "react";
import { useRecordingMedia } from "@/hooks/use-recording-media";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerProps {
  recordingId: string;
  videoUrl: string | null;
  recordingUrl: string | null;
  title: string;
  participants: EventParticipant[];
  grantId: string | null;
  notetakerId?: string | null;
  onRefreshMedia?: () => Promise<void>;
}

export function VideoPlayer({ 
  recordingId,
  videoUrl: initialVideoUrl,
  recordingUrl,
  notetakerId,
  onRefreshMedia
}: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const { refreshMedia } = useRecordingMedia();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setVideoUrl(initialVideoUrl);
    setIsLoaded(false);
  }, [initialVideoUrl]);

  const handlePlay = async () => {
    if (onRefreshMedia) {
      await onRefreshMedia();
    } else if (notetakerId) {
      await refreshMedia(recordingId, notetakerId);
    }
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
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
        src={finalVideoUrl}
        controls
        autoPlay
        className="w-full h-full"
        playsInline
        preload="auto"
        controlsList="nodownload"
        onPlay={handlePlay}
        onLoadedData={handleLoadedData}
        onCanPlay={() => {
          const video = document.querySelector('video');
          if (video) {
            video.play().catch(e => console.log('Autoplay prevented:', e));
          }
        }}
      >
        <source src={finalVideoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}