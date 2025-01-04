import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EventHeader } from "./EventHeader";
import { EventDescription } from "./EventDescription";
import { EventActions } from "./EventActions";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
  isPast: boolean;
}

export const EventCard = ({ event, userId, isPast }: EventCardProps) => {
  const [isQueued, setIsQueued] = useState(false);
  const location = useLocation();
  const isCalendarRoute = location.pathname === "/calendar";

  // Determine if meeting is internal
  const isInternalMeeting = (() => {
    const organizer = event.organizer;
    const participants = event.participants;
    
    if (!organizer?.email || !participants?.length) return true;
    const organizerDomain = organizer.email.split('@')[1];
    return participants.every(participant => 
      participant.email.split('@')[1] === organizerDomain
    );
  })();

  // Fetch user's profile to get Nylas grant ID
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('nylas_grant_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile data:', data);
      return data;
    },
  });

  // Check if event is already in queue
  const checkQueueStatus = async () => {
    console.log('Checking queue status for event:', event.id);
    const { data, error } = await supabase
      .from('notetaker_queue')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking queue status:', error);
      return;
    }

    console.log('Queue status:', data ? 'Queued' : 'Not queued');
    setIsQueued(!!data);
  };

  // Load initial queue status
  useState(() => {
    checkQueueStatus();
  }, [event.id, userId]);

  const handleQueueToggle = (newState: boolean) => {
    setIsQueued(newState);
  };

  console.log('Rendering EventCard:', {
    eventId: event.id,
    hasConferenceUrl: !!event.conference_url,
    nylasGrantId: profile?.nylas_grant_id,
    isQueued
  });

  return (
    <Card className={isPast ? "opacity-60" : ""}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <EventHeader 
            title={event.title}
            startTime={event.start_time}
            endTime={event.end_time}
            participants={event.participants}
            organizer={event.organizer}
            isInternalMeeting={isInternalMeeting}
          />

          <EventDescription description={event.description} />

          <EventActions 
            conferenceUrl={event.conference_url}
            isQueued={isQueued}
            eventId={event.id}
            userId={userId}
            scheduledFor={event.start_time}
            nylasGrantId={profile?.nylas_grant_id}
            onToggle={handleQueueToggle}
            isPast={isPast}
            isCalendarRoute={isCalendarRoute}
          />
        </div>
      </CardContent>
    </Card>
  );
};