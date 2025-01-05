import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { VideoPlayerView } from "./VideoPlayerView";

interface RecordingGridProps {
  recordings: any[];
  isLoading: boolean;
}

export function RecordingGrid({ recordings, isLoading }: RecordingGridProps) {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="cursor-pointer">
            <div className="aspect-video bg-muted animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No recordings found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recordings.map((recording) => (
          <Card
            key={recording.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedRecording(recording.id)}
          >
            <div className="aspect-video bg-muted relative">
              {recording.video_url && (
                <video
                  src={recording.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              )}
              {recording.duration && (
                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-sm px-2 py-1 rounded">
                  {Math.floor(recording.duration / 60)} min
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium line-clamp-1">{recording.event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(recording.event.start_time), "PPp")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRecording && (
        <VideoPlayerView
          recordingId={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </>
  );
}