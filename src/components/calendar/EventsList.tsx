import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventsTable } from "./EventsTable";
import { SkeletonTable } from "./SkeletonTable";

interface EventsListProps {
  events: any[];
  isLoadingEvents: boolean;
  userId: string;
  refetchEvents: () => Promise<void>;
}

export const EventsList = ({ events, isLoadingEvents, userId, refetchEvents }: EventsListProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const syncEvents = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      console.log('Syncing events...');
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
            <SkeletonTable />
          ) : events && events.length > 0 ? (
            <EventsTable events={events} />
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