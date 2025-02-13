
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventList } from "./EventList";
import { PaginationControls } from "./PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Clock } from "lucide-react";
import { format } from "date-fns";

interface RecurringEventInstancesProps {
  events: any[];
}

const ITEMS_PER_PAGE = 5;

export function RecurringEventInstances({ events }: RecurringEventInstancesProps) {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [currentPage, setCurrentPage] = useState(1);

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
  const hasRecordings = pastEvents.some(event => event.recordings?.length > 0);

  // Filter current view events based on active tab
  const currentEvents = activeTab === "upcoming" ? upcomingEvents.slice(1) : pastEvents;
  
  // Calculate pagination
  const totalPages = Math.ceil(currentEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = currentEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as "upcoming" | "past");
          setCurrentPage(1);
        }}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">
                <div className="flex items-center gap-2">
                  Past
                  {hasRecordings && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50">
                      <Video className="h-3 w-3 mr-1" />
                      Recordings
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upcoming" className="space-y-4">
            {currentEvents.length === 0 ? (
              <Card className="p-4">
                <p className="text-center text-muted-foreground">
                  No more upcoming events
                </p>
              </Card>
            ) : (
              <>
                <EventList
                  events={paginatedEvents}
                  expandedEvents={expandedEvents}
                  onToggleExpand={toggleExpand}
                  onSelectRecording={setSelectedRecording}
                  isUpcoming={true}
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
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {currentEvents.length === 0 ? (
              <Card className="p-4">
                <p className="text-center text-muted-foreground">
                  No past events found
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
          </TabsContent>
        </Tabs>
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
