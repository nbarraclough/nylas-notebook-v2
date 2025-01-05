import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { EventDescription } from "@/components/calendar/EventDescription";
import { EventParticipants } from "@/components/calendar/EventParticipants";

interface EventListProps {
  events: any[];
  expandedEvents: Set<string>;
  onToggleExpand: (eventId: string) => void;
  onSelectRecording: (recordingId: string) => void;
}

export function EventList({ 
  events, 
  expandedEvents, 
  onToggleExpand,
  onSelectRecording 
}: EventListProps) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card 
          key={event.id} 
          className="p-4 space-y-3 hover:shadow-md transition-shadow duration-200"
        >
          <div 
            className="flex items-start justify-between cursor-pointer group"
            onClick={() => onToggleExpand(event.id)}
          >
            <div className="flex gap-3">
              <div className="mt-1 hidden sm:block">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {format(new Date(event.start_time), "EEEE, MMMM d")}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(event.start_time), "h:mm a")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-1 mt-2 bg-purple-50 hover:bg-purple-50 text-purple-700"
                  >
                    <Users className="w-3 h-3" />
                    {event.participants?.length || 0} participants
                  </Badge>
                  <div className="mt-2">
                    <EventParticipants 
                      participants={event.participants || []}
                      organizer={event.organizer}
                      isInternalMeeting={isInternalMeeting(event)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="group-hover:bg-slate-50"
            >
              {expandedEvents.has(event.id) ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {expandedEvents.has(event.id) && (
            <div className="pt-3 space-y-4 border-t mt-2">
              {event.description && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium mb-2 text-slate-700">Meeting Agenda</h5>
                  <EventDescription description={event.description} />
                </div>
              )}

              {event.recordings && event.recordings.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-slate-700">Recordings</h5>
                  {event.recordings.map((recording: any) => (
                    <Button
                      key={recording.id}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-between hover:bg-slate-50"
                      onClick={() => onSelectRecording(recording.id)}
                    >
                      <span>View Recording</span>
                      {recording.duration && (
                        <span className="text-muted-foreground text-xs">
                          {Math.floor(recording.duration / 60)} min
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
    </div>
  );
}

function isInternalMeeting(event: any) {
  const participants = event.participants || [];
  if (participants.length === 0) return true;
  
  const organizerDomain = event.organizer?.email?.split('@')[1];
  if (!organizerDomain) return true;
  
  return participants.every(participant => 
    participant.email?.split('@')[1] === organizerDomain
  );
}