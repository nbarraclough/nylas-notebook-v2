import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'] & {
  notetaker_queue?: {
    id: string;
    status: string;
  }[];
};

export function UpcomingMeetings({ userId }: { userId: string }) {
  const { data: upcomingEvents, isLoading } = useQuery<Event[]>({
    queryKey: ['dashboard-upcoming-events', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('No user ID available, skipping events fetch');
        return [];
      }

      console.log('Fetching upcoming events for dashboard:', userId);
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
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userId
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

  return (
    <div className="space-y-4 overflow-y-auto max-h-[500px]">
      {upcomingEvents && upcomingEvents.length > 0 ? (
        upcomingEvents.map((event) => (
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
                  {event.conference_url && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Video className="h-4 w-4" />
                      <span>Video conference available</span>
                    </div>
                  )}
                </div>
                {event.notetaker_queue?.length > 0 && (
                  <Badge variant="secondary">
                    Recording {event.notetaker_queue[0].status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-4">
          No upcoming meetings. Time to relax!
        </p>
      )}
    </div>
  );
}