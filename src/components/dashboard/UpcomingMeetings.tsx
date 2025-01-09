import { useQuery } from "@tanstack/react-query";
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

export function UpcomingMeetings({ userId }: { userId: string }) {
  const navigate = useNavigate();
  
  const { data: upcomingEvents, isLoading } = useQuery({
    queryKey: ['dashboard-upcoming-events', userId],
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
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!upcomingEvents?.length) {
    return (
      <div className="text-center py-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                <span>{format(new Date(event.start_time), "MMM d, h:mm a")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="mr-2">
                Recording {event.notetaker_queue?.[0]?.status}
              </Badge>
              {event.conference_url && (
                <Button
                  size="sm"
                  variant="outline"
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