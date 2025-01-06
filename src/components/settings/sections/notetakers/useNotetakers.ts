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

      // Combine and deduplicate records
      const allRecords = [
        ...(recordingsData || []),
        ...(queueData || [])
      ].filter(record => record.notetaker_id);

      console.log('Combined records before deduplication:', allRecords);

      // Remove duplicates based on notetaker_id and ensure correct typing
      const uniqueRecords = Array.from(
        new Map(allRecords.map(record => [record.notetaker_id, {
          id: record.id,
          notetaker_id: record.notetaker_id,
          event: {
            title: record.event?.title || '',
            start_time: record.event?.start_time || '',
            manual_meeting: record.event?.manual_meeting ? {
              title: record.event.manual_meeting.title,
              meeting_url: record.event.manual_meeting.meeting_url
            } : undefined
          }
        } as NotetakerRecord]))
        .values()
      );

      console.log('Final unique records:', uniqueRecords);
      return uniqueRecords;
    },
  });
}