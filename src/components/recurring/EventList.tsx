import { EventCard } from "./EventCard";
import { Event } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface EventListProps {
  events: Event[];
  masterId: string;
  isLoading: boolean;
}

export function EventList({ events, masterId, isLoading }: EventListProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in EventList:', event, !!session);
      setUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile data using React Query
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        throw error;
      }

      return data;
    },
    enabled: !!userId,
  });

  if (isLoading || !userId) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const handleTogglePin = async (eventId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_event_notes')
        .update({ pinned: !isPinned })
        .eq('master_event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: isPinned ? "Event unpinned" : "Event pinned",
        description: isPinned ? "Event removed from pinned items" : "Event will now appear at the top of the list",
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive",
      });
    }
  };

  // Transform events for the EventCard component
  const transformedEvents = events.map(event => ({
    masterId: event.master_event_id || '',
    latestEvent: {
      title: event.title,
      participants: event.participants || [],
      organizer: event.organizer || {},
      start_time: event.start_time,
    },
    nextEvent: event,
    recordingsCount: event.recordings?.length || 0,
    isPinned: event.recurring_event_notes?.[0]?.pinned || false,
    event: event, // Pass the full event object
  }));

  return (
    <div className="space-y-4">
      {transformedEvents.map((event, index) => (
        <EventCard
          key={`${event.masterId}-${index}`}
          event={event.event}
          onTogglePin={handleTogglePin}
          masterId={event.masterId}
          latestEvent={event.latestEvent}
          nextEvent={event.nextEvent}
          recordingsCount={event.recordingsCount}
          isPinned={event.isPinned}
        />
      ))}
    </div>
  );
}