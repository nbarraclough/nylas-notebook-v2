import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useVideoViews } from "@/hooks/use-video-views";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";

interface SharedRecording {
  id: string;
  video_url: string;
  recording_url: string;
  notetaker_id: string | null;
  transcript_content: Json | null;
  event: EventData;
}

interface EventData {
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  participants: EventParticipant[];
}

export function useSharedVideo() {
  const { token } = useParams();
  const { toast } = useToast();
  const { trackView } = useVideoViews();
  const [recording, setRecording] = useState<SharedRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const transformParticipants = (participants: Json): EventParticipant[] => {
    if (!Array.isArray(participants)) return [];
    
    return participants.map(p => {
      if (typeof p === 'string') {
        return {
          email: p,
          name: p.split('@')[0]
        };
      }
      if (typeof p === 'object' && p !== null) {
        return {
          email: (p as any).email || '',
          name: (p as any).name || (p as any).email?.split('@')[0] || ''
        };
      }
      return {
        email: '',
        name: ''
      };
    });
  };

  const refreshMedia = async () => {
    if (!recording?.id || !recording.notetaker_id) return;

    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId: recording.id,
          notetakerId: recording.notetaker_id
        },
      });

      if (error) throw error;

      // Refetch recording data
      await fetchRecording();
    } catch (error: any) {
      console.error('Error refreshing media:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh media",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchRecording = async () => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      console.log('Fetching shared video with token:', token);

      const { data: shares, error: sharesError } = await supabase
        .from('video_shares')
        .select('recording_id')
        .eq('external_token', token)
        .eq('share_type', 'external')
        .maybeSingle();

      if (sharesError) {
        console.error('Error fetching video share:', sharesError);
        throw sharesError;
      }

      if (!shares) {
        console.error('No share found for token:', token);
        throw new Error('Recording not found');
      }

      const { data: recordingData, error: recordingError } = await supabase
        .from('recordings')
        .select(`
          id,
          video_url,
          recording_url,
          notetaker_id,
          transcript_content,
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants
          )
        `)
        .eq('id', shares.recording_id)
        .maybeSingle();

      if (recordingError) {
        console.error('Error fetching recording:', recordingError);
        throw recordingError;
      }

      if (!recordingData || !recordingData.event) {
        console.error('No recording found:', recordingData);
        throw new Error('Recording not found');
      }

      const transformedEventData: EventData = {
        title: recordingData.event.title || '',
        description: recordingData.event.description || null,
        start_time: recordingData.event.start_time || '',
        end_time: recordingData.event.end_time || '',
        participants: transformParticipants(recordingData.event.participants || [])
      };

      setEventData(transformedEventData);

      const transformedRecording: SharedRecording = {
        id: recordingData.id,
        video_url: recordingData.video_url || '',
        recording_url: recordingData.recording_url || '',
        notetaker_id: recordingData.notetaker_id,
        transcript_content: recordingData.transcript_content,
        event: transformedEventData
      };

      setRecording(transformedRecording);
      trackView(transformedRecording.id);
    } catch (error: any) {
      console.error('Error in fetchRecording:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load recording",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    recording,
    eventData,
    isLoading,
    isRefreshing,
    refreshMedia,
    fetchRecording
  };
}