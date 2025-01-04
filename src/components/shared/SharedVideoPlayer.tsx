interface SharedVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
}

export function SharedVideoPlayer({ videoUrl, recordingUrl }: SharedVideoPlayerProps) {
  // Use video_url if available, fall back to recording_url
  const finalVideoUrl = videoUrl || recordingUrl;

  if (!finalVideoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Video not available</p>
      </div>
    );
  }

  return (
    <video
      src={finalVideoUrl}
      controls
      className="w-full h-full rounded-lg"
      autoPlay
    >
      Your browser does not support the video tag.
    </video>
  );
}