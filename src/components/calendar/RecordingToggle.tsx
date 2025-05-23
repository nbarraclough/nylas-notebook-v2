
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
        
        // Use the create-notetaker function with manual_override set to true
        const { data, error } = await supabase.functions.invoke('create-notetaker', {
          body: {
            event_id: eventId,
            join_time: joinTime,
            meeting_settings: {
              video_recording: true,
              audio_recording: true,
              transcription: true
            },
            manual_override: true  // Add this parameter to bypass recording rules check
          }
        });

        if (error) throw error;

        onToggle(true);
        toast({
          title: "Success",
          description: "Meeting scheduled for recording!",
        });
      } else {
        // First, get the notetaker_id for this event
        const { data: recordingData, error: recordingError } = await supabase
          .from('recordings')
          .select('id, notetaker_id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .not('status', 'eq', 'cancelled')
          .maybeSingle();

        if (recordingError) throw recordingError;
        
        if (!recordingData || !recordingData.notetaker_id) {
          throw new Error("No notetaker found for this event");
        }
        
        // Use the kick-notetaker function to send a DELETE request to Nylas
        const { data, error } = await supabase.functions.invoke('kick-notetaker', {
          body: {
            notetakerId: recordingData.notetaker_id
          }
        });

        if (error) throw error;

        onToggle(false);
        toast({
          title: "Success",
          description: "Meeting recording cancelled.",
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
