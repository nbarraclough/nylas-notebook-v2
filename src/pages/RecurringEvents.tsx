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
      
      // First fetch events with master_event_id
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
          ),
          recurring_event_notes (*)
        `)
        .not('master_event_id', 'is', null);

      if (eventsError) {
        console.error('Error fetching recurring events:', eventsError);
        throw eventsError;
      }

      // Then fetch events with ical_uid but no master_event_id
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
          ),
          recurring_event_notes (*)
        `)
        .is('master_event_id', null)
        .not('ical_uid', 'is', null);

      if (icalError) {
        console.error('Error fetching ical events:', icalError);
        throw icalError;
      }

      // Combine both sets of events
      const allEvents = [...(events || []), ...(icalEvents || [])];
      
      // Group events by master_event_id or ical_uid
      const groupedEvents = allEvents.reduce((acc, event) => {
        const masterId = event.master_event_id || 
                        (event.ical_uid ? event.ical_uid.split('@')[0] : null);
        
        if (!masterId) return acc;
        
        if (!acc[masterId]) {
          acc[masterId] = [];
        }
        
        acc[masterId].push(event);
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