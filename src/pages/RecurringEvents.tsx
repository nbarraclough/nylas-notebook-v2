import { PageLayout } from "@/components/layout/PageLayout";
import { RecurringEventsList } from "@/components/recurring/RecurringEventsList";
import { RecurringEventsFilters } from "@/components/recurring/RecurringEventsFilters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function RecurringEvents() {
  const [filters, setFilters] = useState({
    participants: [] as string[],
    startDate: null as Date | null,
    endDate: null as Date | null,
    searchQuery: null as string | null,
  });

  // First fetch events with recordings
  const { data: recurringEvents, isLoading } = useQuery({
    queryKey: ['recurring-events'],
    queryFn: async () => {
      console.log('Fetching recurring events...');
      
      // First fetch events with recordings
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          recordings (
            id,
            recording_url,
            video_url,
            duration,
            transcript_content,
            created_at
          )
        `)
        .not('master_event_id', 'is', null)
        .order('start_time', { ascending: false });

      if (eventsError) {
        console.error('Error fetching recurring events:', eventsError);
        throw eventsError;
      }

      // Then fetch notes separately
      const masterEventIds = [...new Set(events.map(event => event.master_event_id))];
      const { data: notes, error: notesError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .in('master_event_id', masterEventIds);

      if (notesError) {
        console.error('Error fetching recurring event notes:', notesError);
        throw notesError;
      }

      // Group events by master_event_id and attach notes
      const groupedEvents = events.reduce((acc, event) => {
        const masterId = event.master_event_id;
        if (!masterId) return acc;
        
        if (!acc[masterId]) {
          acc[masterId] = [];
        }
        // Find notes for this master_event_id
        const eventNotes = notes?.filter(note => note.master_event_id === masterId) || [];
        // Create a new object with both event data and notes
        const eventWithNotes = {
          ...event,
          recurring_event_notes: eventNotes
        };
        acc[masterId].push(eventWithNotes);
        return acc;
      }, {} as Record<string, any[]>);

      console.log('Grouped recurring events:', groupedEvents);
      return groupedEvents;
    },
  });

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recurring Events</h1>
        </div>

        <RecurringEventsFilters
          filters={filters}
          onFiltersChange={setFilters}
        />

        <RecurringEventsList
          recurringEvents={recurringEvents}
          isLoading={isLoading}
          filters={filters}
        />
      </div>
    </PageLayout>
  );
}