import { useState } from "react";
import { Card } from "@/components/ui/card";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventList } from "./EventList";
import { PaginationControls } from "./PaginationControls";

interface RecurringEventInstancesProps {
  events: any[];
}

const ITEMS_PER_PAGE = 5;

export function RecurringEventInstances({ events }: RecurringEventInstancesProps) {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort events based on current date and tab
  const now = new Date();
  const filteredEvents = events
    .filter(event => {
      const eventDate = new Date(event.start_time);
      return activeTab === "upcoming" ? eventDate >= now : eventDate < now;
    })
    .sort((a, b) => {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      return activeTab === "upcoming" 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to first page when changing tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value as "upcoming" | "past");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-lg">Events & Recordings</h4>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="upcoming">
            {paginatedEvents.length === 0 ? (
              <Card className="p-4">
                <p className="text-center text-muted-foreground">
                  No upcoming events found
                </p>
              </Card>
            ) : (
              <>
                <EventList
                  events={paginatedEvents}
                  masterId={events[0]?.master_event_id || ''}
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
          <TabsContent value="past">
            {paginatedEvents.length === 0 ? (
              <Card className="p-4">
                <p className="text-center text-muted-foreground">
                  No past events found
                </p>
              </Card>
            ) : (
              <>
                <EventList
                  events={paginatedEvents}
                  masterId={events[0]?.master_event_id || ''}
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
        </div>
      </Tabs>

      {selectedRecording && (
        <VideoPlayerView
          recordingId={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}