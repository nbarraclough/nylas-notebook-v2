import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { useState } from "react";

interface RecurringEventInstancesProps {
  events: any[];
}

export function RecurringEventInstances({ events }: RecurringEventInstancesProps) {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Events & Recordings</h4>
      {events.map((event) => (
        <Card key={event.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {format(new Date(event.start_time), "PPp")}
              </p>
              <p className="text-sm text-muted-foreground">
                {event.participants?.length || 0} participants
              </p>
            </div>
          </div>

          {event.recordings && event.recordings.length > 0 && (
            <div className="space-y-2">
              {event.recordings.map((recording: any) => (
                <Button
                  key={recording.id}
                  variant="outline"
                  size="sm"
                  className="w-full text-left"
                  onClick={() => setSelectedRecording(recording.id)}
                >
                  View Recording
                  {recording.duration && (
                    <span className="ml-2 text-muted-foreground">
                      ({Math.floor(recording.duration / 60)} min)
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </Card>
      ))}

      {selectedRecording && (
        <VideoPlayerView
          recordingId={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}