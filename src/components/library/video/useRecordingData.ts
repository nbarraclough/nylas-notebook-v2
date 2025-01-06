import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecordingData(recordingId: string) {
  const queryClient = useQueryClient();

  const { data: recording, isLoading, error } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      console.log('Fetching recording data for:', recordingId);
      
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer,
            manual_meeting:manual_meetings (
              user_id
            )
          ),
          video_shares (
            id,
            share_type,
            external_token
          )
        `)
        .eq('id', recordingId)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      if (error) {
        console.error('Error fetching recording:', error);
        throw error;
      }

      if (!data) {
        console.log('No recording found with id:', recordingId);
        return null;
      }

      return data;
    },
  });

  return { recording, isLoading, error };
}