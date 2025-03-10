
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

interface UseRecordingsProps {
  isAuthenticated: boolean | null;
  recordingId?: string | null;
  page?: number;
  pageSize?: number;
  filters?: {
    startDate: Date | null;
    endDate: Date | null;
    participants: string[];
    titleSearch: string | null;
    hasPublicLink: boolean;
  };
  showErrors?: boolean;
  showScheduled?: boolean; // New prop to control showing scheduled meetings
}

interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export function useRecordings({ 
  isAuthenticated, 
  recordingId, 
  page = 1, 
  pageSize = 8,
  filters,
  showErrors = false,
  showScheduled = false // Default to false - don't show scheduled meetings
}: UseRecordingsProps) {
  return useQuery({
    queryKey: ['library-recordings', filters, isAuthenticated, recordingId, page, pageSize, showErrors, showScheduled],
    queryFn: async () => {
      console.log('Fetching recordings with auth status:', isAuthenticated);
      
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !recordingId) {
        console.error('No active session found');
        throw new Error('Authentication required');
      }

      // Calculate range for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
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
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Always filter out cancelled recordings unless explicitly requested (showErrors = true)
      if (!showErrors) {
        query = query.not('status', 'in', '("error","failed_entry","failed","cancelled")');
      } else {
        query = query.not('status', 'eq', 'cancelled');
      }
      
      // Filter out scheduled meetings that haven't started yet
      if (!showScheduled) {
        const now = new Date().toISOString();
        
        // Filter out recordings where:
        // 1. The event hasn't started yet, OR
        // 2. The recording is still in waiting/joining state
        query = query
          .or(`event.start_time.lte.${now},and(status.neq.waiting,status.neq.joining,status.neq.waiting_for_admission,status.neq.dispatched)`);
      }

      // If not authenticated, only fetch the shared recording
      if (!isAuthenticated) {
        if (!recordingId) return { data: [], count: 0 };
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
          // First get the recording IDs that have external video shares
          const { data: shareData, error: shareError } = await supabase
            .from('video_shares')
            .select('recording_id')
            .eq('share_type', 'external');

          if (shareError) {
            console.error('Error fetching video shares:', shareError);
            throw shareError;
          }

          // If we have recording IDs with public links, filter the main query
          if (shareData && shareData.length > 0) {
            const recordingIds = shareData.map(share => share.recording_id);
            query = query.in('id', recordingIds);
          } else {
            // If no recordings have public links, return empty result
            return { data: [], count: 0 };
          }
        }
      }

      // Apply pagination after all other filters
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching recordings:', error);
        if (error.code === 'PGRST116') {
          throw new Error('You do not have permission to view this recording.');
        }
        throw error;
      }

      if (recordingId && (!data || data.length === 0)) {
        throw new Error('Recording not found or you do not have permission to view it.');
      }

      // Process recordings
      const processedData = (data || []).map(recording => ({
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

      return {
        data: processedData,
        count: count || 0
      } as PaginatedResponse<typeof processedData[0]>;
    },
    enabled: isAuthenticated !== null || !!recordingId,
    retry: false
  });
}
