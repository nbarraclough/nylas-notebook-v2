import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventParticipants } from "./EventParticipants";
import { RecordingToggle } from "./RecordingToggle";
import DOMPurify from "dompurify";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
}

export const EventCard = ({ event, userId }: EventCardProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isQueued, setIsQueued] = useState(false);

  // Check if event is already in queue
  const checkQueueStatus = async () => {
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

    setIsQueued(!!data);
  };

  // Load initial queue status
  useState(() => {
    checkQueueStatus();
  }, [event.id, userId]);

  const handleQueueToggle = (newState: boolean) => {
    setIsQueued(newState);
  };

  const sanitizedDescription = event.description ? DOMPurify.sanitize(event.description, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  }) : '';

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <RecordingToggle
            isQueued={isQueued}
            eventId={event.id}
            userId={userId}
            hasConferenceUrl={!!event.conference_url}
            scheduledFor={event.start_time}
            onToggle={handleQueueToggle}
          />
        </div>

        {sanitizedDescription && (
          <div 
            className="text-sm text-muted-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        )}

        {event.conference_url && (
          <div className="text-sm">
            <a 
              href={event.conference_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Join meeting
            </a>
          </div>
        )}

        <EventParticipants 
          participants={event.participants as any[]} 
          organizer={event.organizer as any}
        />
      </CardContent>
    </Card>
  );
};