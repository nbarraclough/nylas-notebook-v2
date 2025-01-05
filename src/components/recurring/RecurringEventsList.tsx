import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

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
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.entries(recurringEvents).map(([masterId, events]) => {
        if (!masterId) return null;
        
        const filteredEvents = filterEvents(events);
        if (filteredEvents.length === 0) return null;

        const latestEvent = events[0];
        const recordingsCount = events.reduce((count, event) => 
          count + (event.recordings?.length || 0), 0
        );

        return (
          <Link key={masterId} to={`/recurring-events/${masterId}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{latestEvent.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {events.length} occurrences • {recordingsCount} recordings
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last occurrence: {format(new Date(latestEvent.start_time), "PPp")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}