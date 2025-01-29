import { useProfile } from "@/hooks/use-profile";
import { EventCard } from "./EventCard";
import { Event } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface EventListProps {
  events: Event[];
  masterId: string;
  isLoading: boolean;
}

export function EventList({ events, masterId, isLoading }: EventListProps) {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the current user's ID from Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const { data: profile } = useProfile(userId || "");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const handleTogglePin = async (eventId: string, isPinned: boolean): Promise<void> => {
    if (!profile?.id) return;
    
    try {
      const { error } = await supabase
        .from('recurring_event_notes')
        .update({ pinned: !isPinned })
        .eq('id', eventId)
        .eq('user_id', profile.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Transform events to match EventCard requirements
  const transformedEvents = events.map(event => ({
    masterId: event.master_event_id || masterId,
    latestEvent: {
      title: event.title,
      participants: event.participants,
      organizer: event.organizer,
      start_time: event.start_time
    },
    nextEvent: event.start_time ? {
      start_time: event.start_time
    } : undefined,
    recordingsCount: event.recordings?.length || 0,
    isPinned: event.recurring_event_notes?.some(note => note.pinned) || false
  }));

  return (
    <div className="space-y-4">
      {transformedEvents.map((event, index) => (
        <EventCard
          key={`${event.masterId}-${index}`}
          event={event}
          onTogglePin={handleTogglePin}
        />
      ))}
    </div>
  );
}