
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { EventHeader } from "./EventHeader";
import { EventDescription } from "./EventDescription";
import { EventActions } from "./EventActions";
import { useProfile } from "@/hooks/use-profile";
import type { Database } from "@/integrations/supabase/types";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Event = Database['public']['Tables']['events']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
  isPast: boolean;
}

export const EventCard = ({ event, userId, isPast }: EventCardProps) => {
  const [isQueued, setIsQueued] = useState(false);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [notetakerId, setNotetakerId] = useState<string | null>(null);
  const location = useLocation();
  const { toast } = useToast();
  const isCalendarRoute = location.pathname === "/calendar";
  const { data: profile, isLoading: profileLoading } = useProfile(userId);

  const parseParticipants = (data: unknown): EventParticipant[] => {
    if (Array.isArray(data)) {
      return data.filter((item): item is EventParticipant => 
        typeof item === 'object' && 
        item !== null && 
        'email' in item && 
        'name' in item
      );
    }
    return [];
  };

  const parseOrganizer = (data: unknown): EventOrganizer | null => {
    if (typeof data === 'object' && data !== null && 'email' in data && 'name' in data) {
      return data as EventOrganizer;
    }
    return null;
  };

  const isInternalMeeting = (() => {
    const organizer = parseOrganizer(event.organizer);
    const participants = parseParticipants(event.participants);
    
    if (!organizer?.email || !participants.length) return true;
    const organizerDomain = organizer.email.split('@')[1];
    return participants.every(participant => 
      participant.email.split('@')[1] === organizerDomain
    );
  })();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard.`
      });
    });
  };

  const checkQueueStatus = async () => {
    if (!userId) return;

    try {
      console.log('Checking recording status for event:', event.id);
      const { data, error } = await supabase
        .from('recordings')
        .select('id, status, calendar_id, notetaker_id')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .not('status', 'eq', 'cancelled') // Filter out cancelled recordings
        .maybeSingle();

      if (error) {
        console.error('Error checking recording status:', error);
        return;
      }

      const isCurrentlyQueued = !!data;
      console.log('Recording status for event:', event.id, 'is:', isCurrentlyQueued, data?.status);
      setIsQueued(isCurrentlyQueued);
      
      if (data) {
        setCalendarId(data.calendar_id);
        setNotetakerId(data.notetaker_id);
      } else {
        setCalendarId(null);
        setNotetakerId(null);
      }
    } catch (err) {
      console.error('Error in checkQueueStatus:', err);
    }
  };

  // Initial check when component mounts
  useEffect(() => {
    checkQueueStatus();
  }, [event.id, userId]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    console.log('Setting up realtime subscription for event:', event.id);
    
    const channel = supabase
      .channel(`recording-status-${event.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recordings',
        filter: `event_id=eq.${event.id}`,
      }, 
      (payload) => {
        console.log('Received recording status update:', payload);
        
        // Handle different events based on status
        if (payload.eventType === 'DELETE') {
          setIsQueued(false);
          setCalendarId(null);
          setNotetakerId(null);
        } else if (payload.eventType === 'INSERT' && payload.new.status !== 'cancelled') {
          setIsQueued(true);
          setCalendarId(payload.new.calendar_id);
          setNotetakerId(payload.new.notetaker_id);
        } else if (payload.eventType === 'UPDATE') {
          // Update IDs
          setCalendarId(payload.new.calendar_id);
          setNotetakerId(payload.new.notetaker_id);
          
          // Only show as queued if status is not cancelled
          if (payload.new.status === 'cancelled') {
            setIsQueued(false);
          } else if (payload.old.status === 'cancelled' && payload.new.status !== 'cancelled') {
            setIsQueued(true);
          }
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription for event:', event.id);
      supabase.removeChannel(channel);
    };
  }, [event.id, userId]);

  const handleQueueToggle = (newState: boolean) => {
    setIsQueued(newState);
  };

  return (
    <Card className={`${isPast ? "opacity-60" : ""} card-hover-effect bg-white/80 backdrop-blur-sm border border-gray-100`}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <EventHeader 
            title={event.title}
            startTime={event.start_time}
            endTime={event.end_time}
            participants={parseParticipants(event.participants)}
            organizer={parseOrganizer(event.organizer)}
            isInternalMeeting={isInternalMeeting}
            conferenceUrl={event.conference_url}
            isQueued={isQueued}
            eventId={event.id}
            userId={userId}
            scheduledFor={event.start_time}
            nylasGrantId={profile?.nylas_grant_id}
            onToggle={handleQueueToggle}
            isPast={isPast}
            htmlLink={event.html_link}
          />

          <EventDescription description={event.description} />

          <EventActions 
            conferenceUrl={event.conference_url}
            isCalendarRoute={isCalendarRoute}
            isPast={isPast}
          />
          
          {/* Only show debugging info if queued */}
          {isQueued && (
            <div className="mt-2 border-t pt-2 text-xs font-mono text-gray-500">
              <div className="flex items-center justify-between mb-1">
                <span>Event ID:</span>
                <div className="flex items-center">
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{event.id}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 ml-1" 
                    onClick={() => copyToClipboard(event.id, "Event ID")}
                  >
                    <CopyIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {calendarId && (
                <div className="flex items-center justify-between mb-1">
                  <span>Calendar ID:</span>
                  <div className="flex items-center">
                    <code className="bg-gray-100 px-1 py-0.5 rounded">{calendarId}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 ml-1" 
                      onClick={() => copyToClipboard(calendarId, "Calendar ID")}
                    >
                      <CopyIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {notetakerId && (
                <div className="flex items-center justify-between">
                  <span>Notetaker ID:</span>
                  <div className="flex items-center">
                    <code className="bg-gray-100 px-1 py-0.5 rounded">{notetakerId}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 ml-1" 
                      onClick={() => copyToClipboard(notetakerId, "Notetaker ID")}
                    >
                      <CopyIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
