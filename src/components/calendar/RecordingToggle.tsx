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
        const { error } = await supabase.functions.invoke('queue-event-recording', {
          body: {
            event_id: eventId,
            user_id: userId,
            scheduled_for: scheduledFor
          }
        });

        if (error) throw error;

        onToggle(true);
        toast({
          title: "Success",
          description: "Meeting scheduled for recording!",
        });
      } else {
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