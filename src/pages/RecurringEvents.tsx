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
      const { data, error } = await supabase
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
          recurring_event_notes (
            content,
            updated_at
          )
        `)
        .not('master_event_id', 'is', null)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching recurring events:', error);
        throw error;
      }

      // Group events by master_event_id
      const groupedEvents = data.reduce((acc, event) => {
        const masterId = event.master_event_id;
        if (!acc[masterId]) {
          acc[masterId] = [];
        }
        acc[masterId].push(event);
        return acc;
      }, {});

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