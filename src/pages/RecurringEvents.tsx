import { PageLayout } from "@/components/layout/PageLayout";
import { RecurringEventsList } from "@/components/recurring/RecurringEventsList";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function RecurringEvents() {
  const [filters, setFilters] = useState({
    participants: [] as string[],
    startDate: null as Date | null,
    endDate: null as Date | null,
    searchQuery: null as string | null,
  });

  const { data: recurringEvents, isLoading } = useQuery({
    queryKey: ['recurring-events', filters],
    queryFn: async () => {
      console.log('Fetching recurring events...');
      
      // Get master events (events that are the source of a recurring series)
      const { data: masterEvents, error: masterEventsError } = await supabase
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
        .not('master_event_id', 'in', ['', null, 'undefined'])  // Single condition to filter out non-recurring events
        .order('start_time', { ascending: false });

      if (masterEventsError) {
        console.error('Error fetching master events:', masterEventsError);
        throw masterEventsError;
      }

      // Get unique master IDs to fetch related events
      const masterIds = [...new Set(masterEvents?.map(event => event.master_event_id) || [])];
      
      // Get all events for each master ID
      const eventsPromises = masterIds.map(masterId =>
        supabase
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
          .eq('master_event_id', masterId)
          .order('start_time', { ascending: false })
      );

      const eventsResults = await Promise.all(eventsPromises);
      const errors = eventsResults.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Errors fetching recurring events:', errors);
        throw errors[0].error;
      }

      // Get notes for all master IDs
      const { data: notes, error: notesError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .in('master_event_id', masterIds);

      if (notesError) {
        console.error('Error fetching recurring event notes:', notesError);
        throw notesError;
      }

      // Group events by master_event_id
      const groupedEvents = masterIds.reduce((acc, masterId, index) => {
        const events = eventsResults[index].data || [];
        if (events.length > 0) {
          // Find notes for this master ID
          const eventNotes = notes?.filter(note => note.master_event_id === masterId) || [];
          
          // Add notes to each event in the group
          const eventsWithNotes = events.map(event => ({
            ...event,
            recurring_event_notes: eventNotes
          }));
          
          acc[masterId] = eventsWithNotes;
        }
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

        <RecurringEventsList
          recurringEvents={recurringEvents || {}}
          isLoading={isLoading}
          filters={filters}
        />
      </div>
    </PageLayout>
  );
}