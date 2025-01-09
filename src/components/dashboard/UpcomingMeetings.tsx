import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'] & {
  notetaker_queue?: {
    id: string;
    status: string;
  }[];
};

export function UpcomingMeetings({ userId }: { userId: string }) {
  const { data: upcomingEvents, isLoading } = useQuery({
    queryKey: ['dashboard-upcoming-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      console.log('Fetching upcoming events for dashboard:', userId, 'from:', now);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          notetaker_queue (
            id,
            status
          )
        `)
        .eq('user_id', userId)
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
    <div className="space-y-4 overflow-y-auto max-h-[500px]">
      {upcomingEvents.map((event) => (
        <Card key={event.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{event.title}</h4>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(event.start_time), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}