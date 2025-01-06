import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecurringRecordingToggleProps {
  masterId: string;
  events: any[];
  onToggle?: (isEnabled: boolean) => void;
}

export function RecurringRecordingToggle({ 
  masterId, 
  events,
  onToggle 
}: RecurringRecordingToggleProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // Fetch initial state from recurring_recording_settings
  useEffect(() => {
    const fetchRecordingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('recurring_recording_settings')
          .select('enabled')
          .eq('master_event_id', masterId)
          .single();

        if (error) throw error;
        
        // If we have a setting, use it. Otherwise, check if any events are queued
        if (data) {
          setIsEnabled(data.enabled);
        } else {
          // Fall back to checking queue state
          const hasQueuedEvents = events.some(event => 
            event.notetaker_queue?.some((q: any) => q.status === 'pending')
          );
          setIsEnabled(hasQueuedEvents);
        }
      } catch (error) {
        console.error('Error fetching recording settings:', error);
        // Fall back to checking queue state
        const hasQueuedEvents = events.some(event => 
          event.notetaker_queue?.some((q: any) => q.status === 'pending')
        );
        setIsEnabled(hasQueuedEvents);
      }
    };

    fetchRecordingSettings();
  }, [masterId, events]);

  const handleToggle = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      console.log('Toggling recording for recurring series:', masterId, enabled);

      if (enabled) {
        // Queue all events that have conference URLs
        const eventsToQueue = events.filter(event => event.conference_url);
        
        for (const event of eventsToQueue) {
          const { error } = await supabase.functions.invoke('queue-event-recording', {
            body: {
              event_id: event.id,
              user_id: event.user_id,
              scheduled_for: event.start_time
            }
          });

          if (error) throw error;
        }

        // Update recurring recording settings
        const { error: settingsError } = await supabase
          .from('recurring_recording_settings')
          .upsert({
            master_event_id: masterId,
            enabled: true,
            user_id: events[0].user_id
          });

        if (settingsError) throw settingsError;

        toast({
          title: "Success",
          description: `${eventsToQueue.length} events scheduled for recording`,
        });
      } else {
        // Remove all events from queue
        const { error } = await supabase
          .from('notetaker_queue')
          .delete()
          .in('event_id', events.map(e => e.id));

        if (error) throw error;

        // Update recurring recording settings
        const { error: settingsError } = await supabase
          .from('recurring_recording_settings')
          .upsert({
            master_event_id: masterId,
            enabled: false,
            user_id: events[0].user_id
          });

        if (settingsError) throw settingsError;

        toast({
          title: "Success",
          description: "Events removed from recording queue",
        });
      }

      setIsEnabled(enabled);
      onToggle?.(enabled);
    } catch (error: any) {
      console.error('Error toggling recording:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update recording status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <span className="text-sm text-muted-foreground">
        Record all events
      </span>
    </div>
  );
}