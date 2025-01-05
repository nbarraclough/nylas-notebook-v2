import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { EventCard } from "./EventCard";
import { format, isPast, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const navigateWeek = (direction: 'next' | 'prev' | 'current') => {
    if (direction === 'current') {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    } else {
      setCurrentWeekStart(prev => 
        direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
      );
    }
  };

  const groupEventsByDate = (events: Event[]): GroupedEvents => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      const endTime = new Date(event.end_time);
      
      // For past events, show all of them
      if (filter === "past") {
        return isPast(endTime);
      }
      
      // For upcoming events, filter by week and ensure they're not past
      return !isPast(endTime) && isWithinInterval(eventDate, {
        start: currentWeekStart,
        end: weekEnd
      });
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

  const weekRange = `${format(currentWeekStart, "MMM d")} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}`;

  return (
    <div className="space-y-4">
      {filter === "upcoming" && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('current')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              This Week
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{weekRange}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            Next Week
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

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
              No {filter} events found{filter === "upcoming" ? " for this week" : ""}. Go to Settings &gt; Manual Sync to fetch your calendar events.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
