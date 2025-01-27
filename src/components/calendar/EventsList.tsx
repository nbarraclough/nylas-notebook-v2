import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { EventCard } from "./EventCard";
import { format, isPast, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { useLocation } from "react-router-dom";

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

export const EventsList = ({ events, isLoadingEvents, userId, refetchEvents, filter }: EventsListProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const location = useLocation();
  const isCalendarPage = location.pathname === "/calendar";
  
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
    
    // Filter out manual events if we're on the calendar page
    const filteredEvents = events
      .filter(event => !isCalendarPage || event.manual_meeting_id === null)
      .filter(event => {
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
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      // Sort in descending order for past events, ascending for upcoming
      return filter === "past" 
        ? dateB - dateA  // Descending for past events
        : dateA - dateB; // Ascending for upcoming events
    });
    
    return sortedDates.map(date => ({
      date: new Date(date),
      events: grouped[date].sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        // Sort events within the same day in the same order as the dates
        return filter === "past" ? timeB - timeA : timeA - timeB;
      })
    }));
  })();

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

      {isLoadingEvents ? (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : sortedGroupedEvents.length > 0 ? (
        <div className="space-y-6">
          {sortedGroupedEvents.map(({ date, events }) => (
            <Card key={date.toISOString()} className="card-hover-effect">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-[#333333] mb-4">
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-6 sm:py-8 text-[#555555]">
              No upcoming events found for this week. Go relax & have fun!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};