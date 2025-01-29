import { useState } from "react";
import { EventList } from "./EventList";
import { PaginationControls } from "./PaginationControls";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RecurringEventInstancesProps {
  events: any[];
  isLoading: boolean;
}

export function RecurringEventInstances({ events, isLoading }: RecurringEventInstancesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("upcoming");
  const itemsPerPage = 5;

  // Filter and sort events
  const now = new Date();
  const upcomingEvents = events
    .filter(event => new Date(event.start_time) > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const pastEvents = events
    .filter(event => new Date(event.start_time) <= now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // Calculate pagination
  const activeEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;
  const totalPages = Math.ceil(activeEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = activeEvents.slice(startIndex, startIndex + itemsPerPage);

  if (events.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No events found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upcoming">
          Upcoming ({upcomingEvents.length})
        </TabsTrigger>
        <TabsTrigger value="past">
          Past ({pastEvents.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="mt-6">
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No upcoming events
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <EventList
              events={paginatedEvents}
              masterId={events[0]?.master_event_id || ''}
              isLoading={isLoading}
            />
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="past" className="mt-6">
        {pastEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No past events
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <EventList
              events={paginatedEvents}
              masterId={events[0]?.master_event_id || ''}
              isLoading={isLoading}
            />
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}