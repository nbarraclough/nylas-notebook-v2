import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer,
            manual_meeting:manual_meetings (*)
          ),
          video_shares (
            share_type,
            organization_id
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

      // Add owner_email to the recording object
      return {
        ...data,
        owner_email: data.owner?.email
      };
    },
  });
}