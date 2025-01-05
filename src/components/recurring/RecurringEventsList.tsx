import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ChevronRight, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface RecurringEventsListProps {
  recurringEvents: Record<string, any[]>;
  isLoading: boolean;
  filters: {
    participants: string[];
    startDate: Date | null;
    endDate: Date | null;
    searchQuery: string | null;
  };
}

export function RecurringEventsList({
  recurringEvents,
  isLoading,
  filters,
}: RecurringEventsListProps) {
  const { toast } = useToast();

  const togglePin = async (masterId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_event_notes')
        .update({ pinned: !currentPinned })
        .eq('master_event_id', masterId);

      if (error) throw error;

      toast({
        title: currentPinned ? "Event unpinned" : "Event pinned",
        description: currentPinned ? "Event removed from pinned items" : "Event will now appear at the top of the list",
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3].map((n) => (
          <Card key={n}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!recurringEvents || Object.keys(recurringEvents).length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No recurring events found.
        </CardContent>
      </Card>
    );
  }

  const filterEvents = (events: any[]) => {
    return events.filter(event => {
      if (filters.startDate && new Date(event.start_time) < filters.startDate) return false;
      if (filters.endDate && new Date(event.start_time) > filters.endDate) return false;

      if (filters.participants.length > 0) {
        const eventParticipants = event.participants || [];
        const hasMatchingParticipant = filters.participants.some(email =>
          eventParticipants.some((p: any) => p.email === email)
        );
        if (!hasMatchingParticipant) return false;
      }

      if (filters.searchQuery && event.recordings) {
        const hasMatchingTranscript = event.recordings.some((recording: any) =>
          recording.transcript_content &&
          JSON.stringify(recording.transcript_content)
            .toLowerCase()
            .includes(filters.searchQuery.toLowerCase())
        );
        if (!hasMatchingTranscript) return false;
      }

      return true;
    });
  };

  // Process and sort events
  const processedEvents = Object.entries(recurringEvents)
    .map(([masterId, events]) => {
      const filteredEvents = filterEvents(events);
      if (filteredEvents.length === 0) return null;

      const latestEvent = events[0];
      const recordingsCount = events.reduce((count, event) => 
        count + (event.recordings?.length || 0), 0
      );
      const isPinned = events[0]?.recurring_event_notes?.[0]?.pinned || false;

      return {
        masterId,
        events: filteredEvents,
        latestEvent,
        recordingsCount,
        isPinned
      };
    })
    .filter(Boolean);

  // Separate pinned and unpinned events
  const pinnedEvents = processedEvents.filter(event => event.isPinned)
    .sort((a, b) => new Date(b.latestEvent.start_time).getTime() - 
                    new Date(a.latestEvent.start_time).getTime());
  
  const unpinnedEvents = processedEvents.filter(event => !event.isPinned)
    .sort((a, b) => new Date(b.latestEvent.start_time).getTime() - 
                    new Date(a.latestEvent.start_time).getTime());

  const EventCard = ({ event }) => (
    <div key={event.masterId} className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.preventDefault();
          togglePin(event.masterId, event.isPinned);
        }}
      >
        {event.isPinned ? (
          <Pin className="h-4 w-4 text-primary fill-primary" />
        ) : (
          <PinOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <Link to={`/recurring-events/${event.masterId}`}>
        <Card className="h-full transition-colors hover:bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {event.isPinned && (
                    <Pin className="h-4 w-4 text-primary fill-primary" />
                  )}
                  <h3 className="text-lg font-semibold">{event.latestEvent.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.recordingsCount} recordings
                </p>
                <p className="text-sm text-muted-foreground">
                  Last occurrence: {format(new Date(event.latestEvent.start_time), "PPp")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );

  return (
    <div className="space-y-8">
      {pinnedEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pinned Meetings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pinnedEvents.map(event => (
              <EventCard key={event.masterId} event={event} />
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recurring Meetings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {unpinnedEvents.map(event => (
            <EventCard key={event.masterId} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}