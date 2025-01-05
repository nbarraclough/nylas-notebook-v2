import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotetakerRecord } from "./types";

export function useNotetakers(userId: string) {
  return useQuery({
    queryKey: ['notetakers', userId],
    queryFn: async () => {
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
        .order('created_at', { ascending: false });

      if (recordingsError) throw recordingsError;

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
        .not('notetaker_id', 'is', null)
        .order('created_at', { ascending: false });

      if (queueError) throw queueError;

      // Combine and deduplicate records
      const allRecords = [
        ...(recordingsData || []),
        ...(queueData || [])
      ].filter(record => record.notetaker_id);

      // Remove duplicates based on notetaker_id
      const uniqueRecords = Array.from(
        new Map(allRecords.map(record => [record.notetaker_id, record]))
        .values()
      ) as NotetakerRecord[];

      return uniqueRecords;
    },
  });
}