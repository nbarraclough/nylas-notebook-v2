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
        .not('notetaker_id', 'is', null);

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

      // Create a map to store records by notetaker_id
      const notetakerMap = new Map();
      
      // First, add all recordings to the map
      recordingsData?.forEach(record => {
        if (record.notetaker_id) {
          notetakerMap.set(record.notetaker_id, {
            ...record,
            source: 'recording'
          });
        }
      });

      // Then, process queue items
      queueData?.forEach(queueItem => {
        if (queueItem.notetaker_id) {
          const existingRecord = notetakerMap.get(queueItem.notetaker_id);
          
          if (existingRecord) {
            // If there's a recording, use its ID but update with queue info
            notetakerMap.set(queueItem.notetaker_id, {
              ...queueItem,
              id: existingRecord.id, // Keep the recording ID
              source: 'both',
              queueId: queueItem.id // Store queue ID separately
            });
          } else {
            // If no recording exists yet, use queue item
            notetakerMap.set(queueItem.notetaker_id, {
              ...queueItem,
              source: 'queue',
              queueId: queueItem.id
            });
          }
        }
      });

      const uniqueRecords = Array.from(notetakerMap.values()) as NotetakerRecord[];

      // Sort records by start_time in descending order (newest first)
      const sortedRecords = uniqueRecords.sort((a, b) => {
        const dateA = new Date(a.event.start_time);
        const dateB = new Date(b.event.start_time);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('Final merged and sorted records:', sortedRecords);
      return sortedRecords;
    },
  });
}