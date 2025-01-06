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
  event: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    participants: EventParticipant[];
  };
}

export function useSharedVideo() {
  const { token } = useParams();
  const { toast } = useToast();
  const { trackView } = useVideoViews();
  const [recording, setRecording] = useState<SharedRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventData, setEventData] = useState<SharedRecording['event'] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const transformParticipants = (participants: Json): EventParticipant[] => {
    if (!Array.isArray(participants)) return [];
    return participants.map(p => ({
      name: (p as any)?.name || 'Unknown',
      email: (p as any)?.email || ''
    }));
  };

  const refreshMedia = async (recordingId: string, notetakerId: string | null) => {
    try {
      setIsRefreshing(true);
      console.log('Refreshing media for recording:', recordingId, 'notetakerId:', notetakerId);
      
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId: notetakerId || undefined
        },
      });

      if (error) {
        console.error('Error refreshing media:', error);
        toast({
          title: "Error",
          description: "Failed to refresh video. Please try again.",
          variant: "destructive",
        });
        return;
      }

      await fetchSharedVideo();
      
      toast({
        title: "Success",
        description: "Video refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing media:', error);
      toast({
        title: "Error",
        description: "Failed to refresh video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSharedVideo = async () => {
    try {
      if (!token) throw new Error('No share token provided');

      console.log('Fetching shared video with token:', token);

      const { data: shares, error: sharesError } = await supabase
        .from('video_shares')
        .select('recording_id')
        .eq('external_token', token)
        .eq('share_type', 'external');

      if (sharesError) {
        console.error('Error fetching video shares:', sharesError);
        throw sharesError;
      }

      if (!shares || shares.length === 0) {
        console.log('No shares found for token:', token);
        setEventData(null);
        setRecording(null);
        return;
      }

      const recordingId = shares[0].recording_id;
      
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
        .eq('id', recordingId)
        .maybeSingle();

      if (recordingError) {
        console.error('Error fetching recording:', recordingError);
        throw recordingError;
      }

      if (!recordingData || !recordingData.event) {
        console.log('No recording or event data found for ID:', recordingId);
        setEventData(null);
        setRecording(null);
        return;
      }

      const eventInfo = {
        ...recordingData.event,
        participants: transformParticipants(recordingData.event.participants || [])
      };
      setEventData(eventInfo);

      const transformedRecording: SharedRecording = {
        id: recordingData.id,
        video_url: recordingData.video_url,
        recording_url: recordingData.recording_url,
        notetaker_id: recordingData.notetaker_id,
        transcript_content: recordingData.transcript_content,
        event: eventInfo
      };

      setRecording(transformedRecording);
      await trackView(recordingData.id);
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
  }, [token, toast, trackView]);

  return {
    recording,
    isLoading,
    eventData,
    isRefreshing,
    refreshMedia
  };
}