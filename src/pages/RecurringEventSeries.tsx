import { useParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecurringEventInstances } from "@/components/recurring/RecurringEventInstances";
import { RecurringEventNotes } from "@/components/recurring/RecurringEventNotes";

export default function RecurringEventSeries() {
  const { masterId } = useParams();

  const { data: events, isLoading } = useQuery({
    queryKey: ['recurring-event-series', masterId],
    queryFn: async () => {
      console.log('Fetching recurring event series:', masterId);
      
      // First get events by master_event_id
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
        .eq('master_event_id', masterId)
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;

      // If no events found by master_event_id, try finding by ical_uid
      let finalEvents = events;
      if (!events?.length && masterId) {
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
          .like('ical_uid', `${masterId}@%`)
          .order('start_time', { ascending: false });

        if (icalError) throw icalError;
        finalEvents = icalEvents;
      }

      // Get notes separately
      const { data: notes, error: notesError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .eq('master_event_id', masterId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      return {
        events: finalEvents || [],
        notes: notes || []
      };
    },
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </PageLayout>
    );
  }

  const latestEvent = events?.events[0];

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
          >
            <Link to="/recurring-events">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{latestEvent?.title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <RecurringEventInstances events={events?.events || []} />
          </div>
          <div>
            <RecurringEventNotes 
              masterId={masterId || ''}
              initialContent={events?.notes?.[0]?.content || ''}
              onSave={async (masterId, content) => {
                const { error } = await supabase
                  .from('recurring_event_notes')
                  .upsert({
                    master_event_id: masterId,
                    content: content,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                  });

                if (error) throw error;
              }}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}