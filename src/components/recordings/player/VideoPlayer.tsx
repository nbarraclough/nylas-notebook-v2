import { Card } from "@/components/ui/card";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerProps {
  recordingId: string;
  videoUrl: string | null;
  recordingUrl: string | null;
  title: string;
  participants: EventParticipant[];
  grantId: string | null;
}

export function VideoPlayer({ 
  videoUrl,
  recordingUrl
}: VideoPlayerProps) {
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
        className="w-full h-full"
        playsInline
        preload="metadata"
        controlsList="nodownload"
      >
        <source src={finalVideoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}