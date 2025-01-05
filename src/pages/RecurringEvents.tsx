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

  const { data: recurringEvents, isLoading } = useQuery({
    queryKey: ['recurring-events'],
    queryFn: async () => {
      console.log('Fetching recurring events...');
      
      // Fetch events that have either a master_event_id or an ical_uid
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

      // Also fetch events with ical_uid but no master_event_id (original recurring events)
      const { data: icalEvents, error: icalError } = await supabase
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
        .is('master_event_id', null)
        .not('ical_uid', 'is', null)
        .order('start_time', { ascending: false });

      if (icalError) {
        console.error('Error fetching ical events:', icalError);
        throw icalError;
      }

      // Combine both sets of events
      const allEvents = [...(events || []), ...(icalEvents || [])];

      // Then fetch notes for all potential master events
      const masterEventIds = [...new Set(allEvents
        .map(event => event.master_event_id || (event.ical_uid ? event.ical_uid.split('@')[0] : event.id))
        .filter(Boolean)
      )];

      const { data: notes, error: notesError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .in('master_event_id', masterEventIds);

      if (notesError) {
        console.error('Error fetching recurring event notes:', notesError);
        throw notesError;
      }

      // Group events by master_event_id or by ical_uid for recurring events
      const groupedEvents = allEvents.reduce((acc, event) => {
        // For events with master_event_id, use that as the key
        // For events with only ical_uid, use the base ical_uid (before the @)
        // Fallback to the event's own id if neither exists
        const masterId = event.master_event_id || 
                        (event.ical_uid ? event.ical_uid.split('@')[0] : event.id);
        
        if (!masterId) return acc;
        
        if (!acc[masterId]) {
          acc[masterId] = [];
        }
        
        // Find notes for this master_event_id
        const eventNotes = notes?.filter(note => 
          note.master_event_id === masterId ||
          note.master_event_id === event.id
        ) || [];
        
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