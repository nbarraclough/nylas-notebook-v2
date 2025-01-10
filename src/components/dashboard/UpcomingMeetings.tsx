import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'] & {
  notetaker_queue?: {
    id: string;
    status: string;
  }[];
};

export function UpcomingMeetings() {
  const navigate = useNavigate();
  const { data: upcomingEvents, isLoading } = useQuery({
    queryKey: ['dashboard-upcoming-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      console.log('Fetching upcoming events from:', now);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          notetaker_queue (
            id,
            status
          )
        `)
        .gte('start_time', now)
        .order('start_time')
        .limit(3);

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      // Filter to only show events that are queued for recording
      const queuedEvents = data?.filter(event => 
        event.notetaker_queue && event.notetaker_queue.length > 0
      ) || [];

      console.log('Fetched upcoming events:', queuedEvents);
      return queuedEvents;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!upcomingEvents?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No upcoming recordings scheduled
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h3 className="text-lg font-semibold tracking-tight">Upcoming Recordings</h3>
        <Button 
          variant="ghost" 
          className="text-sm hover:bg-blue-50" 
          onClick={() => navigate("/calendar")}
        >
          <span className="hidden sm:inline">View more</span>
          <ArrowRight className="h-4 w-4 ml-0 sm:ml-2" />
        </Button>
      </div>
      <div className="space-y-4">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="p-4 rounded-lg border border-gray-100 bg-white/50 backdrop-blur-sm card-hover-effect"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium line-clamp-1 flex-1 mr-2">
                {event.title}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  {format(new Date(event.start_time), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {event.notetaker_queue && event.notetaker_queue.length > 0 && (
                <Badge variant="secondary">
                  Recording {event.notetaker_queue[0].status}
                </Badge>
              )}
              {event.conference_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  asChild
                >
                  <a 
                    href={event.conference_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Join meeting
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}