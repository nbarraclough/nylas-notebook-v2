
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { EventList } from "./EventList";
import { PaginationControls } from "./PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Clock } from "lucide-react";
import { format } from "date-fns";
import { Toggle } from "@/components/ui/toggle";

interface RecurringEventInstancesProps {
  events: any[];
}

const ITEMS_PER_PAGE = 5;

export function RecurringEventInstances({ events }: RecurringEventInstancesProps) {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyRecordings, setShowOnlyRecordings] = useState(true);

  const toggleExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Filter and sort events based on current date
  const now = new Date();
  const { upcomingEvents, pastEvents } = events.reduce(
    (acc, event) => {
      const eventDate = new Date(event.start_time);
      if (eventDate >= now) {
        acc.upcomingEvents.push(event);
      } else {
        acc.pastEvents.push(event);
      }
      return acc;
    },
    { upcomingEvents: [], pastEvents: [] }
  );

  // Sort upcoming events ascending, past events descending
  upcomingEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  pastEvents.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const nextUpcomingMeeting = upcomingEvents[0];
  
  // Filter past events if showOnlyRecordings is true
  const filteredPastEvents = showOnlyRecordings 
    ? pastEvents.filter(event => event.recordings?.length > 0)
    : pastEvents;
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredPastEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = filteredPastEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {nextUpcomingMeeting && (
        <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Next Meeting</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(nextUpcomingMeeting.start_time), "EEEE, MMMM d")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(nextUpcomingMeeting.start_time), "h:mm a")}</span>
                </div>
              </div>
              {nextUpcomingMeeting.conference_url && (
                <a
                  href={nextUpcomingMeeting.conference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Join Meeting
                </a>
              )}
            </div>
            {nextUpcomingMeeting.description && (
              <div className="bg-white dark:bg-purple-900/30 rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Meeting Agenda</h4>
                <div className="text-sm text-muted-foreground">{nextUpcomingMeeting.description}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Past Meetings</h2>
          <Toggle 
            pressed={showOnlyRecordings}
            onPressedChange={setShowOnlyRecordings}
            variant="outline"
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            Only show meetings with recordings
          </Toggle>
        </div>

        {filteredPastEvents.length === 0 ? (
          <Card className="p-4">
            <p className="text-center text-muted-foreground">
              {showOnlyRecordings 
                ? "No recorded meetings found" 
                : "No past meetings found"}
            </p>
          </Card>
        ) : (
          <>
            <EventList
              events={paginatedEvents}
              expandedEvents={expandedEvents}
              onToggleExpand={toggleExpand}
              onSelectRecording={setSelectedRecording}
            />
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {selectedRecording && (
        <VideoPlayerView
          recordingId={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}
