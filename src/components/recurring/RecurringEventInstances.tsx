import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { useState } from "react";
import { EventDescription } from "@/components/calendar/EventDescription";

interface RecurringEventInstancesProps {
  events: any[];
}

export function RecurringEventInstances({ events }: RecurringEventInstancesProps) {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Events & Recordings</h4>
      {events.map((event) => (
        <Card key={event.id} className="p-3 space-y-2">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleExpand(event.id)}
          >
            <div>
              <p className="font-medium">
                {format(new Date(event.start_time), "PPp")}
              </p>
              <Badge variant="secondary" className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3" />
                {event.participants?.length || 0} participants
              </Badge>
            </div>
            <Button variant="ghost" size="icon">
              {expandedEvents.has(event.id) ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {expandedEvents.has(event.id) && (
            <div className="pt-2 space-y-3 border-t">
              {event.description && (
                <EventDescription description={event.description} />
              )}

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