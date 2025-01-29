import { Card } from "@/components/ui/card";
import { EventCard } from "./EventCard";
import { RecurringRecordingToggle } from "./RecurringRecordingToggle";
import { useProfile } from "@/hooks/use-profile";
import type { Event } from "@/types/calendar";

interface EventListProps {
  events: Event[];
  masterId: string;
  isLoading?: boolean;
}

export function EventList({ events, masterId, isLoading }: EventListProps) {
  const { data: profile } = useProfile(""); // Empty string as placeholder, we'll get the actual user ID from auth context later

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No events found</p>
      </div>
    );
  }

  const handleTogglePin = async (masterId: string, currentPinned: boolean): Promise<void> => {
    // Implementation of pin toggling
    console.log("Toggle pin", masterId, currentPinned);
  };

  // Transform events to match EventCard props format
  const transformedEvents = events.map(event => ({
    masterId: event.master_event_id || event.id,
    latestEvent: {
      title: event.title,
      participants: event.participants,
      organizer: event.organizer,
      start_time: event.start_time
    },
    nextEvent: {
      start_time: event.start_time
    },
    recordingsCount: event.recordings?.length || 0,
    isPinned: event.recurring_event_notes?.[0]?.pinned || false
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecurringRecordingToggle masterId={masterId} events={events} />
      </div>
      
      {transformedEvents.map((event) => (
        <EventCard
          key={event.masterId}
          event={event}
          onTogglePin={handleTogglePin}
        />
      ))}
    </div>
  );
}