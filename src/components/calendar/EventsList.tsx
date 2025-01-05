import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./EventCard";
import { Progress } from "@/components/ui/progress";
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

export const EventsList = ({ events, isLoadingEvents, userId, refetchEvents, filter }: EventsListProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const syncEvents = async () => {
    if (!userId) return;

    try {
      setIsSyncing(true);
      setSyncProgress(25);
      console.log('Syncing events...');
      
      const { error } = await supabase.functions.invoke('sync-nylas-events', {
        body: { user_id: userId }
      });

      if (error) throw error;

      setSyncProgress(75);
      await refetchEvents();
      setSyncProgress(100);

      toast({
        title: "Success",
        description: "Calendar events synced successfully!",
      });
    } catch (error) {
      console.error('Error syncing events:', error);
      toast({
        title: "Error",
        description: "Failed to sync calendar events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
      }, 1000);
    }
  };

  // Filter and group events by date in user's timezone
  const groupEventsByDate = (events: Event[]): GroupedEvents => {
    const now = new Date();
    const filteredEvents = events.filter(event => {
      const endTime = new Date(event.end_time);
      return filter === "upcoming" ? !isPast(endTime) : isPast(endTime);
    });

    return filteredEvents.reduce((groups: GroupedEvents, event) => {
      // Convert the UTC timestamp to local date for grouping
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

  // Sort events by start time within each group
  const sortedGroupedEvents = (() => {
    const grouped = groupEventsByDate(events);
    // Sort dates using local timezone comparison
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    // Sort events within each date
    return sortedDates.map(date => ({
      date: new Date(date),
      events: grouped[date].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    }));
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button 
            onClick={syncEvents} 
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            {isSyncing ? "Syncing..." : "Sync Events"}
          </Button>
        </div>
        
        {isSyncing && (
          <div className="space-y-2">
            <Progress value={syncProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Syncing your calendar events...
            </p>
          </div>
        )}
      </div>

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
              No {filter} events found. Click "Sync Events" to fetch your calendar events.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
