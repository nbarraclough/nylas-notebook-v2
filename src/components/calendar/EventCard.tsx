import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Video } from "lucide-react";
import { format } from "date-fns";
import { RecordingToggle } from "./RecordingToggle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    start_time: string;
    conference_url?: string | null;
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

  console.log('EventCard props:', {
    eventId: event.id,
    hasConferenceUrl: !!event.conference_url,
    isQueued,
    nylasGrantId: profile?.nylas_grant_id,
    scheduledFor: event.start_time,
    notetakerQueue: event.notetaker_queue // Add this for debugging
  });

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">{event.title}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(event.start_time), "PPp")}</span>
            </div>
            {event.conference_url && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                <span>Has conference URL</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
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
      </CardContent>
    </Card>
  );
}