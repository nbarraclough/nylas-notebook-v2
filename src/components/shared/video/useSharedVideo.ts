import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useVideoViews } from "@/hooks/use-video-views";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";

interface SharedRecording {
  id: string;
  video_url: string | null;
  recording_url: string | null;
  notetaker_id: string | null;
  transcript_content: Json | null;
  mux_playback_id: string | null;
  event: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    participants: EventParticipant[];
  } | null;
}

interface SharedRecordingResponse {
  id: string;
  video_url: string | null;
  recording_url: string | null;
  notetaker_id: string | null;
  transcript_content: Json | null;
  mux_playback_id: string | null;
  event: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    participants: Json[];
  };
}

export function useSharedVideo() {
  const { token } = useParams();
  const { toast } = useToast();
  const { trackView } = useVideoViews();
  const [recording, setRecording] = useState<SharedRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventData, setEventData] = useState<SharedRecording['event'] | null>(null);

  const transformParticipants = (participants: Json): EventParticipant[] => {
    if (!Array.isArray(participants)) return [];
    return participants.map(p => ({
      name: (p as any)?.name || 'Unknown',
      email: (p as any)?.email || ''
    }));
  };

  const fetchSharedVideo = async () => {
    try {
      if (!token) {
        console.log('No share token provided');
        throw new Error('No share token provided');
      }

      console.log('Fetching shared video data...');

      const { data: recordingData, error: recordingError } = await supabase
        .rpc('get_shared_recording', {
          p_recording_id: token,
          p_token: token
        });

      if (recordingError) {
        console.error('Error fetching recording:', recordingError);
        throw recordingError;
      }

      if (!recordingData || recordingData.length === 0) {
        console.log('No recording or event data found');
        setEventData(null);
        setRecording(null);
        return;
      }

      const sharedRecording = recordingData[0] as SharedRecordingResponse;
      console.log('Received recording data:', sharedRecording);

      // Transform event data from the JSON response
      const eventInfo = sharedRecording.event ? {
        title: sharedRecording.event.title,
        description: sharedRecording.event.description,
        start_time: sharedRecording.event.start_time,
        end_time: sharedRecording.event.end_time,
        participants: transformParticipants(sharedRecording.event.participants)
      } : null;

      console.log('Setting event info:', eventInfo);
      setEventData(eventInfo);

      const transformedRecording: SharedRecording = {
        id: sharedRecording.id,
        video_url: sharedRecording.video_url,
        recording_url: sharedRecording.recording_url,
        notetaker_id: sharedRecording.notetaker_id,
        transcript_content: sharedRecording.transcript_content,
        mux_playback_id: sharedRecording.mux_playback_id,
        event: eventInfo
      };

      console.log('Setting recording data:', transformedRecording);
      setRecording(transformedRecording);
      
      console.log('Tracking view');
      await trackView(sharedRecording.id);
    } catch (error) {
      console.error('Error fetching shared video:', error);
      toast({
        title: "Error",
        description: "Failed to load the shared video.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedVideo();
  }, [token]);

  return {
    recording,
    isLoading,
    eventData
  };
}