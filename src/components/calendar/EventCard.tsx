import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventParticipants } from "./EventParticipants";
import { RecordingToggle } from "./RecordingToggle";
import DOMPurify from "dompurify";
import type { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

type Event = Database['public']['Tables']['events']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
}

export const EventCard = ({ event, userId }: EventCardProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const location = useLocation();
  const isCalendarRoute = location.pathname === "/calendar";

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
  useEffect(() => {
    checkQueueStatus();
  }, [event.id, userId]);

  const handleQueueToggle = (newState: boolean) => {
    setIsQueued(newState);
  };

  const sanitizedDescription = event.description ? DOMPurify.sanitize(event.description, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  }) : '';

  console.log('Rendering EventCard:', {
    eventId: event.id,
    hasConferenceUrl: !!event.conference_url,
    nylasGrantId: profile?.nylas_grant_id,
    isQueued
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex items-start gap-2">
            <EventParticipants 
              participants={event.participants as any[]} 
              organizer={event.organizer as any}
              isInternalMeeting={false}
            />
            <div>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          {event.conference_url && (
            <RecordingToggle
              isQueued={isQueued}
              eventId={event.id}
              userId={userId}
              hasConferenceUrl={!!event.conference_url}
              scheduledFor={event.start_time}
              nylasGrantId={profile?.nylas_grant_id}
              onToggle={handleQueueToggle}
            />
          )}
        </div>

        {sanitizedDescription && (
          <div 
            className="text-sm text-muted-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        )}

        {event.conference_url && isCalendarRoute && (
          <div className="text-sm">
            <Button 
              variant="outline"
              size="sm"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};