import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RecurringEventMaster } from "./RecurringEventMaster";

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

  const handleSaveNotes = async (masterId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('recurring_event_notes')
        .upsert({
          master_event_id: masterId,
          content: content,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error saving notes",
        description: "There was a problem saving your notes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filterEvents = (events: any[]) => {
    return events.filter(event => {
      // Filter by date range
      if (filters.startDate && new Date(event.start_time) < filters.startDate) return false;
      if (filters.endDate && new Date(event.start_time) > filters.endDate) return false;

      // Filter by participants
      if (filters.participants.length > 0) {
        const eventParticipants = event.participants || [];
        const hasMatchingParticipant = filters.participants.some(email =>
          eventParticipants.some((p: any) => p.email === email)
        );
        if (!hasMatchingParticipant) return false;
      }

      // Filter by search query in transcripts
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <Card key={n}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!recurringEvents || Object.keys(recurringEvents).length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No recurring events found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(recurringEvents).map(([masterId, events]) => {
        if (!masterId) return null;
        
        const filteredEvents = filterEvents(events);
        if (filteredEvents.length === 0) return null;

        const notes = events[0]?.recurring_event_notes || [];

        return (
          <RecurringEventMaster
            key={masterId}
            masterId={masterId}
            events={filteredEvents}
            notes={notes}
            onSaveNotes={handleSaveNotes}
          />
        );
      })}
    </div>
  );
}