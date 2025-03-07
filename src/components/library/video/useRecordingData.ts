
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const getMuxPlaybackUrl = (playbackId: string | null): string | null => {
  if (!playbackId) return null;
  return `https://stream.mux.com/${playbackId}.m3u8`;
};

export function useRecordingData(recordingId: string | null) {
  return useQuery({
    queryKey: ['recording', recordingId],
    enabled: !!recordingId,
    queryFn: async () => {
      if (!recordingId) return null;

      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          owner:profiles!inner (
            email
          ),
          event:events (
            id,
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer,
            manual_meeting:manual_meetings (*)
          ),
          transcript_content,
          video_shares (
            share_type,
            organization_id,
            external_token
          )
        `)
        .eq('id', recordingId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching recording:', error);
        throw error;
      }

      if (!data) {
        console.log('No recording found with ID:', recordingId);
        return null;
      }

      // Add owner_email and construct Mux playback URL
      return {
        ...data,
        owner_email: data.owner?.email,
        mux_playback_url: getMuxPlaybackUrl(data.mux_playback_id),
        has_video: !!data.video_url || !!data.recording_url || !!data.mux_playback_id,
        has_transcript: !!data.transcript_content
      };
    },
  });
}
