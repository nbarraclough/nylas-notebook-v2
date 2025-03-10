
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotetakerRecord } from "./types";

export function useNotetakers(userId: string, showScheduled: boolean = false) {
  return useQuery({
    queryKey: ['notetakers', userId, showScheduled],
    queryFn: async () => {
      console.log('Fetching notetakers for user:', userId);

      // Build the query
      let query = supabase
        .from('recordings')
        .select(`
          id,
          notetaker_id,
          status,
          manual_override,
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
        .not('notetaker_id', 'is', null)
        .not('status', 'eq', 'cancelled'); // Explicitly filter out cancelled notetakers

      // If we're not showing scheduled meetings, filter by event start time
      if (!showScheduled) {
        const now = new Date().toISOString();
        query = query.or(`event.start_time.lte.${now},and(status.neq.waiting,status.neq.joining,status.neq.waiting_for_admission,status.neq.dispatched)`);
      }

      const { data: recordingsData, error: recordingsError } = await query;

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
