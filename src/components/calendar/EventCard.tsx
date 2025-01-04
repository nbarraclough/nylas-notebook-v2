import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";

type Event = Database['public']['Tables']['events']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface EventCardProps {
  event: Event;
  userId: string;
}

export const EventCard = ({ event, userId }: EventCardProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isQueued, setIsQueued] = useState(false);

  const participants = event.participants as EventParticipant[];
  const organizer = event.organizer as EventOrganizer;
  
  const isInternalMeeting = participants.every(participant => {
    const organizerDomain = organizer?.email?.split('@')[1];
    const participantDomain = participant.email?.split('@')[1];
    return organizerDomain && participantDomain && organizerDomain === participantDomain;
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    };

    const checkQueueStatus = async () => {
      const { data, error } = await supabase
        .from('notetaker_queue')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking queue status:', error);
        return;
      }

      setIsQueued(!!data);
    };

    fetchProfile();
    checkQueueStatus();
  }, [userId, event.id]);

  const shouldAutoRecord = () => {
    if (!profile) return false;
    
    if (isInternalMeeting && profile.record_internal_meetings) return true;
    if (!isInternalMeeting && profile.record_external_meetings) return true;
    
    return false;
  };

  const handleRecordingToggle = async () => {
    if (!event.conference_url) {
      toast({
        title: "Error",
        description: "This event doesn't have a conference URL.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.nylas_grant_id) {
      toast({
        title: "Error",
        description: "Nylas connection not found. Please connect your calendar first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      if (!isQueued) {
        // Add to queue
        const { error } = await supabase
          .from('notetaker_queue')
          .insert({
            user_id: userId,
            event_id: event.id,
            scheduled_for: event.start_time,
          });

        if (error) throw error;

        setIsQueued(true);
        toast({
          title: "Success",
          description: "Meeting scheduled for recording!",
        });
      } else {
        // Remove from queue
        const { error } = await supabase
          .from('notetaker_queue')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', userId);

        if (error) throw error;

        setIsQueued(false);
        toast({
          title: "Success",
          description: "Meeting removed from recording queue.",
        });
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast({
        title: "Error",
        description: "Failed to update recording status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d, yyyy, h:mm a')} - ${format(new Date(end), 'h:mm a')}`;
  };

  // Auto-queue recording if rules match
  useEffect(() => {
    if (shouldAutoRecord() && !isQueued && event.conference_url) {
      handleRecordingToggle();
    }
  }, [profile?.record_internal_meetings, profile?.record_external_meetings]);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <HoverCard>
              <HoverCardTrigger>
                <Users 
                  className={`mt-1 ${
                    isInternalMeeting 
                      ? "text-purple-500 hover:text-purple-600" 
                      : "text-blue-500 hover:text-blue-600"
                  }`} 
                />
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Participants</h4>
                  <div className="text-sm space-y-1">
                    {participants.map((participant, index) => (
                      <div key={index} className="text-muted-foreground">
                        {participant.name} ({participant.email})
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
            
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
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Record</span>
            <Switch 
              checked={isQueued}
              onCheckedChange={handleRecordingToggle}
              disabled={isLoading || !event.conference_url}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};