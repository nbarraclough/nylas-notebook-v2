
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface RecordingToggleProps {
  isQueued: boolean;
  eventId: string;
  userId: string;
  hasConferenceUrl: boolean;
  scheduledFor: string;
  nylasGrantId?: string | null;
  onToggle: (newState: boolean) => void;
}

export const RecordingToggle = ({ 
  isQueued, 
  eventId, 
  userId, 
  hasConferenceUrl,
  scheduledFor,
  nylasGrantId,
  onToggle 
}: RecordingToggleProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRecordingToggle = async () => {
    if (!hasConferenceUrl) {
      toast({
        title: "Error",
        description: "This event doesn't have a conference URL.",
        variant: "destructive",
      });
      return;
    }

    if (!nylasGrantId) {
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
        // Calculate join time (epoch seconds) for the meeting start time
        const startDate = new Date(scheduledFor);
        const joinTime = Math.floor(startDate.getTime() / 1000);
        
        // Use the new create-notetaker function instead of queue-event-recording
        const { data, error } = await supabase.functions.invoke('create-notetaker', {
          body: {
            event_id: eventId,
            join_time: joinTime,
            meeting_settings: {
              video_recording: true,
              audio_recording: true,
              transcription: true
            }
          }
        });

        if (error) throw error;

        onToggle(true);
        toast({
          title: "Success",
          description: "Meeting scheduled for recording!",
        });
      } else {
        // For now, we'll still remove from the queue table
        // In the future, we could add a "cancel" endpoint
        const { error } = await supabase
          .from('notetaker_queue')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);

        if (error) throw error;

        onToggle(false);
        toast({
          title: "Success",
          description: "Meeting removed from recording queue.",
        });
      }
    } catch (error: any) {
      console.error('Error toggling recording:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update recording status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Record</span>
      <Switch 
        checked={isQueued}
        onCheckedChange={handleRecordingToggle}
        disabled={isLoading || !hasConferenceUrl || !nylasGrantId}
      />
    </div>
  );
};
