import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventsSection } from "./EventsSection";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [localEvents, setLocalEvents] = useState(recurringEvents);

  const togglePin = useCallback(async (masterId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_event_notes')
        .update({ pinned: !currentPinned })
        .eq('master_event_id', masterId);

      if (error) throw error;

      setLocalEvents(prev => {
        const updated = { ...prev };
        const events = updated[masterId];
        if (events?.[0]) {
          events[0].recurring_event_notes = events[0].recurring_event_notes || [];
          if (events[0].recurring_event_notes[0]) {
            events[0].recurring_event_notes[0].pinned = !currentPinned;
          } else {
            events[0].recurring_event_notes[0] = { pinned: !currentPinned };
          }
        }
        return updated;
      });

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
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2].map((section) => (
          <div key={section} className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((card) => (
                <Card key={card}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
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

  const processedEvents = Object.entries(localEvents || {})
    .map(([masterId, events]) => {
      const filteredEvents = filterEvents(events);
      if (filteredEvents.length === 0) return null;

      const sortedEvents = [...events].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      const now = new Date();
      const latestEvent = [...sortedEvents]
        .reverse()
        .find(event => new Date(event.start_time) <= now);
      
      const nextEvent = sortedEvents
        .find(event => new Date(event.start_time) > now);

      const recordingsCount = events.reduce((count, event) => 
        count + (event.recordings?.length || 0), 0
      );
      const isPinned = events[0]?.recurring_event_notes?.[0]?.pinned || false;

      return {
        masterId,
        events: filteredEvents,
        latestEvent: latestEvent || sortedEvents[0],
        nextEvent,
        recordingsCount,
        isPinned
      };
    })
    .filter(Boolean);

  const pinnedEvents = processedEvents
    .filter(event => event.isPinned)
    .sort((a, b) => new Date(b.latestEvent.start_time).getTime() - 
                    new Date(a.latestEvent.start_time).getTime());
  
  const unpinnedEvents = processedEvents
    .filter(event => !event.isPinned)
    .sort((a, b) => new Date(b.latestEvent.start_time).getTime() - 
                    new Date(a.latestEvent.start_time).getTime());

  // Only show no data message if we're not loading and there are no events after filtering
  if (!isLoading && (!processedEvents || processedEvents.length === 0)) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No recurring events found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <EventsSection 
        title="Pinned Meetings" 
        events={pinnedEvents}
        onTogglePin={togglePin}
      />
      <EventsSection 
        title="Recurring Meetings" 
        events={unpinnedEvents}
        onTogglePin={togglePin}
      />
    </div>
  );
}