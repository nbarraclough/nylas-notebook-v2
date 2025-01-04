import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
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

  console.log('RecordingToggle props:', {
    isQueued,
    eventId,
    hasConferenceUrl,
    scheduledFor,
    nylasGrantId,
    isLoading
  });

  const handleRecordingToggle = async () => {
    if (!hasConferenceUrl) {
      console.log('Toggle blocked: No conference URL');
      toast({
        title: "Error",
        description: "This event doesn't have a conference URL.",
        variant: "destructive",
      });
      return;
    }

    if (!nylasGrantId) {
      console.log('Toggle blocked: No Nylas grant ID');
      toast({
        title: "Error",
        description: "Nylas connection not found. Please connect your calendar first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Toggling recording for event:', eventId, 'Current state:', isQueued);

      if (!isQueued) {
        // Add to queue
        const { error } = await supabase
          .from('notetaker_queue')
          .insert({
            user_id: userId,
            event_id: eventId,
            scheduled_for: scheduledFor,
          });

        if (error) {
          console.error('Error adding to queue:', error);
          throw error;
        }

        onToggle(true);
        toast({
          title: "Success",
          description: "Meeting scheduled for recording!",
        });
      } else {
        // Remove from queue
        const { error } = await supabase
          .from('notetaker_queue')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error removing from queue:', error);
          throw error;
        }

        onToggle(false);
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