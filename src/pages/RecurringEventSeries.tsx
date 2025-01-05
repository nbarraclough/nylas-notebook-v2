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
      
      // First try to find events by master_event_id
      let { data: events, error: eventsError } = await supabase
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
        .or(`master_event_id.eq.${masterId},id.eq.${masterId}`);

      if (eventsError) throw eventsError;

      // If no events found by master_event_id, try finding by ical_uid
      if (!events?.length) {
        const { data: sourceEvent } = await supabase
          .from('events')
          .select('ical_uid')
          .eq('id', masterId)
          .single();

        if (sourceEvent?.ical_uid) {
          const baseIcalUid = sourceEvent.ical_uid.split('@')[0];
          const { data: relatedEvents, error } = await supabase
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
            .like('ical_uid', `${baseIcalUid}%`);

          if (error) throw error;
          events = relatedEvents;
        }
      }

      const { data: notes, error: notesError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .eq('master_event_id', masterId)
        .maybeSingle();

      if (notesError) throw notesError;

      return {
        events: events || [],
        notes
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
              initialContent={events?.notes?.content || ''}
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