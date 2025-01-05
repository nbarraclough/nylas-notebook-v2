import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { EventCard } from "./EventCard";
import { format, isPast } from "date-fns";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'];

interface EventsListProps {
  events: Event[];
  isLoadingEvents: boolean;
  userId: string;
  refetchEvents: (options?: RefetchOptions) => Promise<QueryObserverResult<Event[], Error>>;
  filter: "upcoming" | "past";
}

interface GroupedEvents {
  [key: string]: Event[];
}

export const EventsList = ({ events, isLoadingEvents, userId, filter }: EventsListProps) => {
  const groupEventsByDate = (events: Event[]): GroupedEvents => {
    const now = new Date();
    const filteredEvents = events.filter(event => {
      const endTime = new Date(event.end_time);
      return filter === "upcoming" ? !isPast(endTime) : isPast(endTime);
    });

    return filteredEvents.reduce((groups: GroupedEvents, event) => {
      const localDate = new Date(event.start_time).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      if (!groups[localDate]) {
        groups[localDate] = [];
      }
      groups[localDate].push(event);
      return groups;
    }, {});
  };

  const sortedGroupedEvents = (() => {
    const grouped = groupEventsByDate(events);
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    return sortedDates.map(date => ({
      date: new Date(date),
      events: grouped[date].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    }));
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 sm:p-6">
          {isLoadingEvents ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          ) : sortedGroupedEvents.length > 0 ? (
            <div className="space-y-6 sm:space-y-8">
              {sortedGroupedEvents.map(({ date, events }) => (
                <div key={date.toISOString()} className="space-y-3 sm:space-y-4">
                  <h2 className="text-base sm:text-lg font-semibold text-[#333333] px-2 sm:px-0">
                    {format(date, "EEEE, MMMM d")}
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {events.map((event) => (
                      <EventCard 
                        key={event.id} 
                        event={event}
                        userId={userId}
                        isPast={isPast(new Date(event.end_time))}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-[#555555]">
              No {filter} events found. Go to Settings &gt; Manual Sync to fetch your calendar events.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};