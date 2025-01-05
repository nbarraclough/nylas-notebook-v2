import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventsSection } from "./EventsSection";
import { useState, useCallback, useEffect } from "react";
import { RecurringEventSkeleton } from "./RecurringEventSkeleton";

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
  const [localEvents, setLocalEvents] = useState<Record<string, any[]>>({});
  const [hasInitialData, setHasInitialData] = useState(false);

  // Update local events when we receive initial data
  useEffect(() => {
    if (!isLoading && Object.keys(recurringEvents).length > 0) {
      setLocalEvents(recurringEvents);
      setHasInitialData(true);
    }
  }, [recurringEvents, isLoading]);

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

  // Show loading skeleton until we have initial data
  if (isLoading || !hasInitialData) {
    return <RecurringEventSkeleton />;
  }

  const processedEvents = Object.entries(localEvents || {})
    .map(([masterId, events]) => {
      if (!events || events.length === 0) return null;

      // Filter events based on date range
      const filteredEvents = events.filter(event => {
        if (!event) return false;
        if (filters.startDate && new Date(event.start_time) < filters.startDate) return false;
        if (filters.endDate && new Date(event.start_time) > filters.endDate) return false;
        return true;
      });

      if (filteredEvents.length === 0) return null;

      // Filter by participants if specified
      if (filters.participants.length > 0) {
        const hasMatchingParticipant = filteredEvents.some(event =>
          filters.participants.some(email =>
            event.participants?.some((p: any) => p.email === email)
          )
        );
        if (!hasMatchingParticipant) return null;
      }

      // Filter by search query if specified
      if (filters.searchQuery) {
        const hasMatchingTranscript = filteredEvents.some(event =>
          event.recordings?.some((recording: any) =>
            recording.transcript_content &&
            JSON.stringify(recording.transcript_content)
              .toLowerCase()
              .includes(filters.searchQuery!.toLowerCase())
          )
        );
        if (!hasMatchingTranscript) return null;
      }

      const sortedEvents = [...filteredEvents].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      const latestEvent = sortedEvents[0];
      const now = new Date();
      const nextEvent = sortedEvents
        .find(event => new Date(event.start_time) > now);

      const recordingsCount = events.reduce((count, event) => 
        count + (event.recordings?.length || 0), 0
      );

      const isPinned = events[0]?.recurring_event_notes?.[0]?.pinned || false;

      return {
        masterId,
        latestEvent,
        nextEvent,
        recordingsCount,
        isPinned
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // First sort by pin status
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by next meeting date (if available)
      const aNextTime = a.nextEvent ? new Date(a.nextEvent.start_time).getTime() : Infinity;
      const bNextTime = b.nextEvent ? new Date(b.nextEvent.start_time).getTime() : Infinity;

      // Sort by next event time ascending (earlier dates first)
      return aNextTime - bNextTime;
    });

  if (!processedEvents || processedEvents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No recurring events found
        </CardContent>
      </Card>
    );
  }

  const pinnedEvents = processedEvents.filter(event => event.isPinned);
  const unpinnedEvents = processedEvents.filter(event => !event.isPinned);

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