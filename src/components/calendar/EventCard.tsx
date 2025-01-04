import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EventParticipants } from "./EventParticipants";
import { RecordingToggle } from "./RecordingToggle";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield } from "lucide-react";
import DOMPurify from "dompurify";
import type { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

type Event = Database['public']['Tables']['events']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
}

export const EventCard = ({ event, userId }: EventCardProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const isCalendarRoute = location.pathname === "/calendar";

  // Determine if meeting is internal
  const isInternalMeeting = (() => {
    if (!event.organizer?.email || !event.participants?.length) return true;
    const organizerDomain = event.organizer.email.split('@')[1];
    return event.participants.every(participant => 
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
  useEffect(() => {
    checkQueueStatus();
  }, [event.id, userId]);

  const handleQueueToggle = (newState: boolean) => {
    setIsQueued(newState);
  };

  // Format description text to handle URLs and preserve formatting
  const formatDescription = (text: string | null) => {
    if (!text) return '';
    
    // Convert URLs to anchor tags
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const textWithLinks = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert line breaks to <br> tags and preserve spacing
    const textWithBreaks = textWithLinks
      .replace(/\n/g, '<br>')
      .replace(/\s{2,}/g, match => '&nbsp;'.repeat(match.length));

    return DOMPurify.sanitize(textWithBreaks, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  };

  const sanitizedDescription = formatDescription(event.description);

  console.log('Rendering EventCard:', {
    eventId: event.id,
    hasConferenceUrl: !!event.conference_url,
    nylasGrantId: profile?.nylas_grant_id,
    isQueued
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <EventParticipants 
                  participants={event.participants as any[]} 
                  organizer={event.organizer as any}
                  isInternalMeeting={isInternalMeeting}
                />
              </div>
              <div>
                <h3 className="font-semibold leading-snug">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
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
              <Badge 
                variant={isInternalMeeting ? "secondary" : "outline"}
                className={`text-xs ${isInternalMeeting ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
              >
                {isInternalMeeting ? (
                  <>
                    <Shield className="w-3 h-3 mr-1" />
                    Internal
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3 mr-1" />
                    External
                  </>
                )}
              </Badge>
            </div>
          </div>

          {sanitizedDescription && (
            <div className="relative">
              <div 
                className={`text-sm text-muted-foreground prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 whitespace-pre-line ${!isExpanded ? 'line-clamp-5' : ''}`}
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
              {sanitizedDescription.split('<br>').length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 hover:bg-accent"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {event.conference_url && isCalendarRoute && (
            <div className="flex justify-start">
              <Button 
                variant="outline"
                size="sm"
                className="hover:bg-accent"
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
        </div>
      </CardContent>
    </Card>
  );
};