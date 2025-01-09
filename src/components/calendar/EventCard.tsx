import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Video, Globe, Shield } from "lucide-react";
import { format } from "date-fns";
import { RecordingToggle } from "./RecordingToggle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventParticipants } from "./EventParticipants";
import { EventDescription } from "./EventDescription";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    start_time: string;
    conference_url?: string | null;
    description?: string | null;
    participants?: any[];
    organizer?: any;
    notetaker_queue?: {
      id: string;
      status: string;
    }[];
  };
  userId: string;
  isPast?: boolean;
}

export function EventCard({ event, userId, isPast = false }: EventCardProps) {
  // Fetch user profile to get nylasGrantId
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('nylas_grant_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      return data;
    },
    enabled: !!userId
  });

  // Check if event is queued for recording
  const isQueued = event.notetaker_queue?.some(q => q.status === 'pending') ?? false;

  // Determine if meeting is internal based on email domains
  const isInternalMeeting = (() => {
    if (!event.participants?.length || !event.organizer?.email) return true;
    
    const organizerDomain = event.organizer.email.split('@')[1];
    return event.participants.every(participant => 
      participant.email?.split('@')[1] === organizerDomain
    );
  })();

  console.log('EventCard props:', {
    eventId: event.id,
    hasConferenceUrl: !!event.conference_url,
    isQueued,
    nylasGrantId: profile?.nylas_grant_id,
    scheduledFor: event.start_time,
    notetakerQueue: event.notetaker_queue
  });

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{event.title}</h3>
                <Badge 
                  variant={isInternalMeeting ? "secondary" : "outline"}
                  className={`text-xs ${
                    isInternalMeeting 
                      ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' 
                      : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}
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
                {event.participants && event.participants.length > 0 && (
                  <EventParticipants 
                    participants={event.participants}
                    organizer={event.organizer}
                    isInternalMeeting={isInternalMeeting}
                  />
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.start_time), "h:mm a")}</span>
              </div>
              {event.conference_url && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <span>Conference available</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {!isPast && event.conference_url && (
                <Button 
                  variant="outline"
                  size="sm"
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
              {!isPast && (
                <RecordingToggle
                  isQueued={isQueued}
                  eventId={event.id}
                  userId={userId}
                  hasConferenceUrl={!!event.conference_url}
                  scheduledFor={event.start_time}
                  nylasGrantId={profile?.nylas_grant_id}
                  onToggle={() => {}}
                />
              )}
            </div>
          </div>
          
          {event.description && (
            <EventDescription description={event.description} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}