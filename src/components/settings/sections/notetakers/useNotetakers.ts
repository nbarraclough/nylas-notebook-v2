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
        console.error('Error fetching recordings:', recordingsError);
        throw recordingsError;
      }

      if (!recordingsData) {
        console.log('No recordings found');
        return [];
      }

      // Transform the data to match NotetakerRecord type
      const allRecords = recordingsData.map(record => ({
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
      }));

      console.log('Combined records before deduplication:', allRecords);

      // Remove duplicates based on notetaker_id
      const uniqueRecords = Array.from(
        new Map(allRecords.map(record => [record.notetaker_id, record]))
        .values()
      );

      console.log('Final unique records:', uniqueRecords);
      return uniqueRecords;
    },
    enabled: !!userId,
  });
}