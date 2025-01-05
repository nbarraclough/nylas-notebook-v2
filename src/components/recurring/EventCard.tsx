import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Pin, PinOff, Shield, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { EventParticipants } from "@/components/calendar/EventParticipants";

interface EventCardProps {
  event: {
    masterId: string;
    latestEvent: {
      title: string;
      participants?: Array<{ email?: string; name?: string }>;
      organizer?: { email?: string };
      start_time?: string;
    } | null;
    nextEvent?: {
      start_time: string;
    } | null;
    recordingsCount: number;
    isPinned: boolean;
  };
  onTogglePin: (masterId: string, currentPinned: boolean) => Promise<void>;
}

export function EventCard({ event, onTogglePin }: EventCardProps) {
  // Early return if no latestEvent
  if (!event.latestEvent) {
    return null;
  }

  // Determine if meeting is internal based on email domains
  const isInternalMeeting = (() => {
    const participants = event.latestEvent.participants || [];
    if (participants.length === 0) return true;
    
    const organizerDomain = event.latestEvent.organizer?.email?.split('@')[1];
    if (!organizerDomain) return true;
    
    return participants.every(participant => 
      participant.email?.split('@')[1] === organizerDomain
    );
  })();

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.preventDefault();
          onTogglePin(event.masterId, event.isPinned);
        }}
      >
        {event.isPinned ? (
          <Pin className="h-4 w-4 text-primary fill-primary" />
        ) : (
          <PinOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <Link to={`/recurring-events/${event.masterId}`}>
        <Card className="h-full card-hover-effect transition-colors hover:bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {event.isPinned && (
                    <Pin className="h-4 w-4 text-primary fill-primary" />
                  )}
                  <h3 className="text-lg font-semibold">{event.latestEvent.title}</h3>
                  <EventParticipants 
                    participants={event.latestEvent.participants || []}
                    organizer={event.latestEvent.organizer}
                    isInternalMeeting={isInternalMeeting}
                  />
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {event.recordingsCount} recording{event.recordingsCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge 
                    variant={isInternalMeeting ? "secondary" : "outline"}
                    className={`text-xs ${isInternalMeeting ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
                  >
                    {isInternalMeeting ? (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Internal
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        External
                      </>
                    )}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {event.nextEvent && (
                    <p className="text-sm text-muted-foreground">
                      Next meeting: {format(new Date(event.nextEvent.start_time), "PPp")}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}