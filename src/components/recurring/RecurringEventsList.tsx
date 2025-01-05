import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const toggleExpanded = (masterId: string) => {
    setExpandedEvents(prev =>
      prev.includes(masterId)
        ? prev.filter(id => id !== masterId)
        : [...prev, masterId]
    );
  };

  const handleSaveNotes = async (masterId: string) => {
    try {
      const { error } = await supabase
        .from('recurring_event_notes')
        .upsert({
          master_event_id: masterId,
          content: notes[masterId],
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
        const filteredEvents = filterEvents(events);
        if (filteredEvents.length === 0) return null;

        const latestEvent = events[0];
        const isExpanded = expandedEvents.includes(masterId);
        const existingNotes = latestEvent.recurring_event_notes?.[0]?.content || '';

        if (!notes[masterId] && existingNotes) {
          setNotes(prev => ({ ...prev, [masterId]: existingNotes }));
        }

        return (
          <Card key={masterId}>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{latestEvent.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {events.length} occurrences
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(masterId)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Notes</h4>
                      <Textarea
                        value={notes[masterId] || ''}
                        onChange={(e) => setNotes(prev => ({
                          ...prev,
                          [masterId]: e.target.value
                        }))}
                        placeholder="Add notes about this recurring event..."
                        className="min-h-[100px]"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveNotes(masterId)}
                      >
                        Save Notes
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Events & Recordings</h4>
                      {filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(new Date(event.start_time), "PPp")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {event.participants?.length || 0} participants
                              </p>
                            </div>
                          </div>

                          {event.recordings && event.recordings.length > 0 && (
                            <div className="space-y-2">
                              {event.recordings.map((recording: any) => (
                                <Button
                                  key={recording.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-left"
                                  onClick={() => setSelectedRecording(recording.id)}
                                >
                                  View Recording
                                  {recording.duration && (
                                    <span className="ml-2 text-muted-foreground">
                                      ({Math.floor(recording.duration / 60)} min)
                                    </span>
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {selectedRecording && (
        <VideoPlayerView
          recordingId={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}