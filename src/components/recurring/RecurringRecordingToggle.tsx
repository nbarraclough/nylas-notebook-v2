
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
  const [settingId, setSettingId] = useState<string | null>(null);

  // Fetch initial state from recurring_recording_settings
  useEffect(() => {
    const fetchRecordingSettings = async () => {
      try {
        // First try to get existing setting
        const { data: existingSetting, error: fetchError } = await supabase
          .from('recurring_recording_settings')
          .select('id, enabled')
          .eq('master_event_id', masterId)
          .eq('user_id', events[0].user_id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        // If we have a setting, use it. Otherwise, check if any events have recordings
        if (existingSetting) {
          setIsEnabled(existingSetting.enabled);
          setSettingId(existingSetting.id);
        } else {
          // Fall back to checking recordings
          const hasRecordings = events.some(event => 
            event.recordings?.length > 0
          );
          setIsEnabled(hasRecordings);
        }
      } catch (error) {
        console.error('Error fetching recording settings:', error);
        // Fall back to checking recordings
        const hasRecordings = events.some(event => 
          event.recordings?.length > 0
        );
        setIsEnabled(hasRecordings);
      }
    };

    fetchRecordingSettings();
  }, [masterId, events]);

  const handleToggle = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      console.log('Toggling recording for recurring series:', masterId, enabled);

      if (enabled) {
        // Create notetakers for all events that have conference URLs
        const eventsToRecord = events.filter(event => event.conference_url);
        
        for (const event of eventsToRecord) {
          // Calculate join time for each event
          const startDate = new Date(event.start_time);
          const joinTime = Math.floor(startDate.getTime() / 1000);
          
          const { error } = await supabase.functions.invoke('create-notetaker', {
            body: {
              event_id: event.id,
              join_time: joinTime,
              meeting_settings: {
                video_recording: true,
                audio_recording: true,
                transcription: true
              },
              manual_override: true // Add manual override parameter
            }
          });

          if (error) throw error;
        }

        // Update or create recurring recording settings
        const { error: settingsError } = await supabase
          .from('recurring_recording_settings')
          .upsert({
            id: settingId || undefined, // Only include id if it exists
            master_event_id: masterId,
            enabled: true,
            user_id: events[0].user_id
          }, {
            onConflict: 'user_id,master_event_id'
          });

        if (settingsError) throw settingsError;

        toast({
          title: "Success",
          description: `${eventsToRecord.length} events scheduled for recording`,
        });
      } else {
        // For each event with a recording, cancel the notetaker
        for (const event of events) {
          if (event.recordings && event.recordings.length > 0) {
            for (const recording of event.recordings) {
              if (recording.notetaker_id) {
                await supabase.functions.invoke('kick-notetaker', {
                  body: {
                    notetakerId: recording.notetaker_id
                  }
                });
              }
            }
          }
        }

        // Update recurring recording settings
        const { error: settingsError } = await supabase
          .from('recurring_recording_settings')
          .upsert({
            id: settingId || undefined, // Only include id if it exists
            master_event_id: masterId,
            enabled: false,
            user_id: events[0].user_id
          }, {
            onConflict: 'user_id,master_event_id'
          });

        if (settingsError) throw settingsError;

        toast({
          title: "Success",
          description: "Recordings cancelled for all events in this series",
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
