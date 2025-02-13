
import { useParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecurringEventInstances } from "@/components/recurring/RecurringEventInstances";
import { RecurringEventNotes } from "@/components/recurring/RecurringEventNotes";
import { RecurringRecordingToggle } from "@/components/recurring/RecurringRecordingToggle";
import { useToast } from "@/components/ui/use-toast";

export default function RecurringEventSeries() {
  const { masterId } = useParams();
  const { toast } = useToast();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['recurring-event-series', masterId],
    queryFn: async () => {
      console.log('Starting fetch with masterId:', masterId);
      
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
          ),
          notetaker_queue (*)
        `)
        .eq('master_event_id', masterId)
        .order('start_time', { ascending: false });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }

      console.log('Events found:', events?.length || 0);

      // If no events found by master_event_id, try finding by ical_uid
      let finalEvents = events;
      if (!events?.length && masterId) {
        console.log('No events found by master_event_id, trying ical_uid');
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
            notetaker_queue (*)
          `)
          .like('ical_uid', `${masterId}@%`)
          .order('start_time', { ascending: false });

        if (icalError) {
          console.error('Error fetching ical events:', icalError);
          throw icalError;
        }
        finalEvents = icalEvents;
        console.log('Events found by ical_uid:', icalEvents?.length || 0);
      }

      // Get note for this master_event_id and current user
      console.log('Fetching note for master_event_id:', masterId);
      const { data: userInfo } = await supabase.auth.getUser();
      const userId = userInfo.user?.id;

      const { data: notes, error: notesError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .eq('master_event_id', masterId)
        .eq('user_id', userId)
        .maybeSingle();

      if (notesError) {
        console.error('Error fetching notes:', notesError);
        throw notesError;
      }

      return {
        events: finalEvents || [],
        note: notes
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
        <div className="flex items-center justify-between">
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
          {events?.events && events.events.length > 0 && (
            <RecurringRecordingToggle 
              masterId={masterId || ''} 
              events={events.events}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <RecurringEventInstances events={events?.events || []} />
          </div>
          <div>
            <RecurringEventNotes 
              masterId={masterId || ''}
              initialContent={events?.note?.content || ''}
              onSave={async (masterId, content) => {
                try {
                  const { data: userInfo } = await supabase.auth.getUser();
                  const userId = userInfo.user?.id;

                  if (!userId) {
                    throw new Error('User not authenticated');
                  }

                  const { error } = await supabase
                    .from('recurring_event_notes')
                    .upsert({
                      master_event_id: masterId,
                      content: content,
                      user_id: userId
                    }, {
                      onConflict: 'master_event_id,user_id'
                    });

                  if (error) throw error;
                  
                  await refetch();
                  toast({
                    description: "Notes saved successfully",
                  });
                } catch (error) {
                  console.error('Error saving note:', error);
                  toast({
                    variant: "destructive",
                    description: "Failed to save notes. Please try again.",
                  });
                  throw error;
                }
              }}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
