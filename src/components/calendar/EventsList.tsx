import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./EventCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: string;
  title: string;
  start_time: string;
  conference_url?: string | null;
  notetaker_queue?: {
    id: string;
    status: string;
  }[];
}

interface EventsListProps {
  events: Event[];
  isLoadingEvents: boolean;
  userId: string;
  refetchEvents: () => void;
  filter: "upcoming" | "past";
}

export function EventsList({ events, isLoadingEvents, userId, refetchEvents, filter }: EventsListProps) {
  // Filter events based on the current time
  const currentTime = new Date();
  const filteredEvents = events.filter(event => {
    const eventTime = new Date(event.start_time);
    return filter === "upcoming" 
      ? eventTime >= currentTime 
      : eventTime < currentTime;
  });

  if (isLoadingEvents) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full" />
        ))}
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No {filter} events found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredEvents.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          userId={userId}
          isPast={filter === "past"}
        />
      ))}
    </div>
  );
}