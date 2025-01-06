import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotetakerRecord } from "./types";

export function useNotetakers(userId: string) {
  return useQuery({
    queryKey: ['notetakers', userId],
    queryFn: async () => {
      console.log('Fetching notetakers for user:', userId);

      // First, get recordings with notetakers
      const { data: recordingsData, error: recordingsError } = await supabase
        .from('recordings')
        .select(`
          id,
          notetaker_id,
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
        .not('notetaker_id', 'is', null);  // Only get recordings with notetaker_id

      console.log('Recordings query result:', { recordingsData, recordingsError });
      
      if (recordingsError) {
        console.error('Recordings error:', recordingsError);
        throw recordingsError;
      }

      // Then, get active notetakers from queue
      const { data: queueData, error: queueError } = await supabase
        .from('notetaker_queue')
        .select(`
          id,
          notetaker_id,
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

      console.log('Queue query result:', { queueData, queueError });

      if (queueError) {
        console.error('Queue error:', queueError);
        throw queueError;
      }

      // Combine records, preserving the most recent notetaker_id
      const allRecords = [
        ...(recordingsData || []),
        ...(queueData || [])
      ].filter(record => record.notetaker_id);

      console.log('Combined records before processing:', allRecords);

      // Create a map to store the most recent record for each notetaker_id
      const notetakerMap = new Map();
      
      allRecords.forEach(record => {
        if (record.notetaker_id) {
          const existingRecord = notetakerMap.get(record.notetaker_id);
          // If no existing record or current record is more recent (based on presence in queue)
          if (!existingRecord || queueData?.some(q => q.id === record.id)) {
            notetakerMap.set(record.notetaker_id, record);
          }
        }
      });

      const uniqueRecords = Array.from(notetakerMap.values()) as NotetakerRecord[];

      console.log('Final unique records:', uniqueRecords);
      return uniqueRecords;
    },
  });
}