import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfDay, isEqual } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Event {
  id: string;
  title: string;
  start_time: string;
  conference_url?: string | null;
  description?: string | null;
  participants?: any[];
  organizer?: any;
  notetaker_queue?: {
    id: string;
    status: string;
  }[];
}

interface EventsListProps {
  events: Event[];
  isLoadingEvents: boolean;
  userId: string;
  refetchEvents: () => void;
  filter: "upcoming" | "past";
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
}

export function EventsList({ 
  events, 
  isLoadingEvents, 
  userId, 
  refetchEvents, 
  filter,
  currentWeekStart,
  onWeekChange 
}: EventsListProps) {
  // Group events by day
  const eventsByDay = events.reduce((acc: { [key: string]: Event[] }, event) => {
    const dayKey = startOfDay(new Date(event.start_time)).toISOString();
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(event);
    return acc;
  }, {});

  // Sort days
  const sortedDays = Object.keys(eventsByDay).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  if (isLoadingEvents) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] w-full" />
        ))}
      </div>
    );
  }

  if (Object.keys(eventsByDay).length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No {filter} events found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newDate = new Date(currentWeekStart);
            newDate.setDate(newDate.getDate() - 7);
            onWeekChange(newDate);
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Week
        </Button>
        <span className="font-medium">
          Week of {format(currentWeekStart, "MMMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newDate = new Date(currentWeekStart);
            newDate.setDate(newDate.getDate() + 7);
            onWeekChange(newDate);
          }}
        >
          Next Week
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {sortedDays.map((day) => (
        <Card key={day} className="overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {format(new Date(day), "EEEE, MMMM d")}
            </h3>
            <div className="space-y-4">
              {eventsByDay[day].map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  userId={userId}
                  isPast={filter === "past"}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}