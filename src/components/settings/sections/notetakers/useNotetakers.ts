
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotetakerRecord } from "./types";

export function useNotetakers(userId: string) {
  return useQuery({
    queryKey: ['notetakers', userId],
    queryFn: async () => {
      console.log('Fetching notetakers for user:', userId);

      // Get recordings with notetakers
      const { data: recordingsData, error: recordingsError } = await supabase
        .from('recordings')
        .select(`
          id,
          notetaker_id,
          status,
          event:events (
            title,
            start_time,
            manual_meeting:manual_meetings (
              title,
              meeting_url
            )
          )
        `)
        .eq('user_id', userId)
        .not('notetaker_id', 'is', null);

      console.log('Recordings query result:', { recordingsData, recordingsError });
      
      if (recordingsError) {
        console.error('Recordings error:', recordingsError);
        throw recordingsError;
      }

      const notetakerRecords = recordingsData?.map(record => ({
        ...record,
        source: 'recording'
      })) || [];

      // Sort records by start_time in descending order (newest first)
      const sortedRecords = notetakerRecords.sort((a, b) => {
        const dateA = new Date(a.event.start_time);
        const dateB = new Date(b.event.start_time);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('Final sorted records:', sortedRecords);
      return sortedRecords as NotetakerRecord[];
    },
  });
}
