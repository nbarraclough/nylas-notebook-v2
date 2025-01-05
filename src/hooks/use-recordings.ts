import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

interface UseRecordingsProps {
  isAuthenticated: boolean | null;
  recordingId?: string | null;
  filters?: {
    startDate: Date | null;
    endDate: Date | null;
    participants: string[];
    titleSearch: string | null;
    hasPublicLink: boolean;
  };
}

export function useRecordings({ isAuthenticated, recordingId, filters }: UseRecordingsProps) {
  return useQuery({
    queryKey: ['library-recordings', filters, isAuthenticated, recordingId],
    queryFn: async () => {
      console.log('Fetching recordings...');
      
      let query = supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            *,
            manual_meeting:manual_meetings (*)
          ),
          video_shares (
            share_type,
            organization_id
          )
        `)
        .order('created_at', { ascending: false });

      // If not authenticated, only fetch the shared recording
      if (!isAuthenticated) {
        if (!recordingId) return [];
        query = query.eq('id', recordingId);
      }

      // Apply filters for authenticated users
      if (isAuthenticated && filters) {
        if (filters.startDate) {
          query = query.gte('event.start_time', filters.startDate.toISOString());
        }

        if (filters.endDate) {
          query = query.lte('event.start_time', filters.endDate.toISOString());
        }

        if (filters.hasPublicLink) {
          query = query.contains('video_shares', [{ share_type: 'external' }]);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recordings:', error);
        if (error.code === 'PGRST116') {
          throw new Error('You do not have permission to view this recording.');
        }
        throw error;
      }

      if (recordingId && data.length === 0) {
        throw new Error('Recording not found or you do not have permission to view it.');
      }

      // Process recordings
      return data.map(recording => ({
        ...recording,
        event: {
          ...recording.event,
          participants: Array.isArray(recording.event?.participants) 
            ? recording.event.participants.map((p: any) => ({
                name: typeof p === 'object' ? p.name || '' : '',
                email: typeof p === 'object' ? p.email || '' : p
              }))
            : []
        }
      }));
    },
    enabled: isAuthenticated !== null || !!recordingId,
    retry: false
  });
}