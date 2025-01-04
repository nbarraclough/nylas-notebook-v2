import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./EventCard";
import { Progress } from "@/components/ui/progress";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const syncEvents = async () => {
    if (!userId) return;

    try {
      setIsSyncing(true);
      setSyncProgress(25);
      console.log('Syncing events...');
      
      // Start the sync process
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
      // Reset the progress after a short delay to show the completion
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
      }, 1000);
    }
  };

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Your Calendar</h1>
          <Button 
            onClick={syncEvents} 
            disabled={isSyncing}
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