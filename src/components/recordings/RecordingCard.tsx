import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventParticipants } from "../calendar/EventParticipants";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";
import { RecordingStatus } from "./RecordingStatus";
import { RecordingActions } from "./RecordingActions";
import { Loader } from "lucide-react";

type Recording = Database['public']['Tables']['recordings']['Row'] & {
  event: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    participants: any;
    organizer: any;
  };
};

interface RecordingCardProps {
  recording: Recording;
}

export const RecordingCard = ({ recording }: RecordingCardProps) => {
  const { toast } = useToast();
  const [isKicking, setIsKicking] = useState(false);
  const [isRetrievingMedia, setIsRetrievingMedia] = useState(false);

  const handleManualKick = async () => {
    try {
      setIsKicking(true);
      console.log('Initiating manual kick for notetaker:', recording.notetaker_id);
      
      const { error } = await supabase.functions.invoke('kick-notetaker', {
        body: { notetakerId: recording.notetaker_id },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Manual kick initiated successfully",
      });
    } catch (error) {
      console.error('Error kicking notetaker:', error);
      toast({
        title: "Error",
        description: "Failed to kick notetaker. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsKicking(false);
    }
  };

  const handleRetrieveMedia = async () => {
    try {
      setIsRetrievingMedia(true);
      console.log('Retrieving media for recording:', recording.id);

      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId: recording.id,
          notetakerId: recording.notetaker_id
        },
      });

      if (error) {
        console.error('Error retrieving media:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Media retrieved successfully",
      });
    } catch (error: any) {
      console.error('Error retrieving media:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to retrieve media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRetrievingMedia(false);
    }
  };

  // Parse participants and organizer from JSON
  const participants: EventParticipant[] = Array.isArray(recording.event.participants) 
    ? recording.event.participants.map((p: any) => ({
        name: p.name || '',
        email: p.email || ''
      }))
    : [];

  const organizer: EventOrganizer = typeof recording.event.organizer === 'object' && recording.event.organizer !== null
    ? {
        name: (recording.event.organizer as any).name || '',
        email: (recording.event.organizer as any).email || ''
      }
    : { name: '', email: '' };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-semibold">{recording.event.title}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(recording.event.start_time), "MMM d, yyyy 'at' h:mm a")}
            </p>
            {recording.duration && (
              <p className="text-sm text-muted-foreground">
                Duration: {Math.floor(recording.duration / 60)} minutes
              </p>
            )}
          </div>
          <RecordingStatus status={recording.status} />
        </div>

        {recording.event.description && (
          <div className="text-sm text-muted-foreground">
            {recording.event.description}
          </div>
        )}

        <div className="flex items-center gap-2">
          {recording.notetaker_id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualKick}
              disabled={isKicking}
            >
              {isKicking ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Kicking...
                </>
              ) : (
                'Manual Kick'
              )}
            </Button>
          )}
        </div>

        <RecordingActions
          recordingId={recording.id}
          notetakerId={recording.notetaker_id}
          videoUrl={recording.video_url}
          status={recording.status}
          title={recording.event.title}
          isRetrievingMedia={isRetrievingMedia}
          onRetrieveMedia={handleRetrieveMedia}
        />

        <EventParticipants 
          participants={participants}
          organizer={organizer}
          isInternalMeeting={false}
        />
      </CardContent>
    </Card>
  );
};