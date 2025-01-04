import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";
import { EventParticipants } from "./EventParticipants";
import { RecordingToggle } from "./RecordingToggle";

type Event = Database['public']['Tables']['events']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
}

export const EventCard = ({ event, userId }: EventCardProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isQueued, setIsQueued] = useState(false);

  // Type assertion for participants and organizer
  const participants = (event.participants as any[] || []).map(p => ({
    name: p.name || '',
    email: p.email || ''
  })) as EventParticipant[];

  const organizer = event.organizer ? {
    name: (event.organizer as any).name || '',
    email: (event.organizer as any).email || ''
  } as EventOrganizer : null;
  
  const isInternalMeeting = participants.every(participant => {
    if (!organizer) return false;
    const organizerDomain = organizer.email?.split('@')[1];
    const participantDomain = participant.email?.split('@')[1];
    return organizerDomain && participantDomain && organizerDomain === participantDomain;
  });

  // Subscribe to profile changes
  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // Check queue status and handle auto-queueing
  useEffect(() => {
    const checkQueueStatus = async () => {
      const { data, error } = await supabase
        .from('notetaker_queue')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking queue status:', error);
        return;
      }

      setIsQueued(!!data);
    };

    checkQueueStatus();
  }, [event.id, userId]);

  const shouldAutoRecord = () => {
    if (!profile) return false;
    
    if (isInternalMeeting && profile.record_internal_meetings) return true;
    if (!isInternalMeeting && profile.record_external_meetings) return true;
    
    return false;
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d, yyyy, h:mm a')} - ${format(new Date(end), 'h:mm a')}`;
  };

  // Auto-queue recording if rules match - now depends on profile changes
  useEffect(() => {
    if (shouldAutoRecord() && !isQueued && event.conference_url) {
      console.log('Auto-queueing recording for event:', event.title);
      const handleAutoQueue = async () => {
        const { error } = await supabase
          .from('notetaker_queue')
          .insert({
            user_id: userId,
            event_id: event.id,
            scheduled_for: event.start_time,
          });

        if (error) {
          console.error('Error auto-queueing recording:', error);
          return;
        }

        setIsQueued(true);
      };

      handleAutoQueue();
    }
  }, [profile?.record_internal_meetings, profile?.record_external_meetings, isQueued, event.conference_url]);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <EventParticipants 
              participants={participants}
              isInternalMeeting={isInternalMeeting}
            />
            
            <div>
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {formatTimeRange(event.start_time, event.end_time)}
              </p>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
          
          <RecordingToggle 
            isQueued={isQueued}
            eventId={event.id}
            userId={userId}
            hasConferenceUrl={!!event.conference_url}
            scheduledFor={event.start_time}
            nylasGrantId={profile?.nylas_grant_id}
            onToggle={setIsQueued}
          />
        </div>
      </CardContent>
    </Card>
  );
};