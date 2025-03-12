
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotetakerRecord } from "./types";

export function useNotetakers(userId: string, showScheduled: boolean = false) {
  return useQuery({
    queryKey: ['notetakers', userId, showScheduled],
    queryFn: async () => {
      console.log(`[NoteTaker] Fetching notetakers for user: ${userId}, showScheduled: ${showScheduled}`);

      // Build the query - Get all recordings with notetaker_id that aren't cancelled
      let query = supabase
        .from('recordings')
        .select(`
          id,
          notetaker_id,
          status,
          manual_override,
          created_at,
          event:events (
            id,
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
        .not('status', 'eq', 'cancelled');

      // If we're not showing scheduled meetings, filter by start time
      if (!showScheduled) {
        const now = new Date().toISOString();
        query = query.lt('event.start_time', now);
      }

      const { data: recordingsData, error: recordingsError } = await query;

      if (recordingsError) {
        console.error('[NoteTaker] Error fetching recordings:', recordingsError);
        throw recordingsError;
      }

      console.log(`[NoteTaker] Recordings query result: ${recordingsData?.length} records found`);
      
      // Filter out recordings with missing or invalid event data
      const validRecordings = recordingsData?.filter(record => 
        record.event && (record.event.title || record.event.manual_meeting?.title)
      ) || [];
      
      console.log(`[NoteTaker] After filtering invalid events: ${validRecordings.length} valid records`);
      
      // For recordings without events or incomplete data, create a default structure
      const notetakerRecords = validRecordings.map(record => {
        // Add more detailed logging including the notetaker ID
        console.log(`[NoteTaker ID: ${record.notetaker_id}] Processing record with status: ${record.status}`);
        
        return {
          ...record,
          event: {
            ...record.event,
            // Use title from manual meeting if it exists, otherwise use event title
            title: record.event.manual_meeting?.title || record.event.title || 'Untitled Meeting'
          },
          source: 'recording'
        };
      });

      // Sort records by start_time in descending order (newest first)
      // Handle cases where event or start_time might be null
      const sortedRecords = notetakerRecords.sort((a, b) => {
        // Fallback dates if event or start_time is missing
        const dateA = a.event?.start_time ? new Date(a.event.start_time) : 
                     a.created_at ? new Date(a.created_at) : new Date(0);
        
        const dateB = b.event?.start_time ? new Date(b.event.start_time) : 
                     b.created_at ? new Date(b.created_at) : new Date(0);
        
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`[NoteTaker] Final sorted records: ${sortedRecords.length}`);
      return sortedRecords as NotetakerRecord[];
    },
  });
}
