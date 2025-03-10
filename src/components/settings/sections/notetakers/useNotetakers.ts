
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
        .not('status', 'eq', 'cancelled'); // Explicitly filter out cancelled notetakers

      // If we're not showing scheduled meetings, filter them out
      if (!showScheduled) {
        const now = new Date().toISOString();
        
        // Add condition to filter based on event start_time only if event exists
        query = query.or(`event.start_time.lt.${now},event.is.null`);
        
        // Also filter out recordings in waiting states
        const waitingStates = ['waiting', 'joining', 'waiting_for_admission', 'dispatched'];
        query = query.not('status', 'in', `(${waitingStates.map(s => `"${s}"`).join(',')})`);
      }

      const { data: recordingsData, error: recordingsError } = await query;

      console.log('Recordings query result:', { recordingsData, recordingsError });
      
      if (recordingsError) {
        console.error('Recordings error:', recordingsError);
        throw recordingsError;
      }

      // For recordings without events or incomplete data, create a default structure
      const notetakerRecords = recordingsData?.map(record => {
        // Check if record has the required event data
        if (!record.event) {
          console.warn(`Recording ${record.id} has no event data`);
          // Return a record with default/fallback values for the event
          return {
            ...record,
            event: {
              id: null,
              title: 'Unknown Event',
              start_time: record.created_at, // Fallback to recording creation time
              manual_meeting: null
            },
            source: 'recording'
          };
        }
        
        return {
          ...record,
          source: 'recording'
        };
      }) || [];

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

      console.log('Final sorted records:', sortedRecords);
      return sortedRecords as NotetakerRecord[];
    },
  });
}
