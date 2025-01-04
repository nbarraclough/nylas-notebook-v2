import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./EventCard";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'];

interface EventsListProps {
  events: Event[];
  isLoadingEvents: boolean;
  userId: string;
  refetchEvents: (options?: RefetchOptions) => Promise<QueryObserverResult<Event[], Error>>;
}

export const EventsList = ({ events, isLoadingEvents, userId, refetchEvents }: EventsListProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const syncEvents = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      console.log('Syncing events...');
      
      // Invoke the sync-nylas-events function to fetch and sync events
      const { error } = await supabase.functions.invoke('sync-nylas-events', {
        body: { user_id: userId }
      });

      if (error) throw error;

      await refetchEvents();
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
      setIsLoading(false);
    }
  };

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Calendar</h1>
        <Button 
          onClick={syncEvents} 
          disabled={isLoading}
        >
          {isLoading ? "Syncing..." : "Sync Events"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoadingEvents ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          ) : sortedEvents && sortedEvents.length > 0 ? (
            <div className="space-y-4">
              {sortedEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  userId={userId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No events found. Click "Sync Events" to fetch your calendar events.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};