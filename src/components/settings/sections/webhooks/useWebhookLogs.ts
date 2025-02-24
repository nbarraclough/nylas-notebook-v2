
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ITEMS_PER_PAGE, WebhookLog } from "./types";

export function useWebhookLogs({
  userId,
  search,
  currentPage,
  webhookType,
  status,
}: {
  userId: string;
  search: string;
  currentPage: number;
  webhookType: string;
  status: string;
}) {
  return useQuery({
    queryKey: ['webhook_logs', search, currentPage, webhookType, status],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      
      let query = supabase
        .from('webhook_logs')
        .select(`
          *,
          relationship:webhook_relationships (
            event_id,
            recording_id,
            notetaker_id
          )
        `, { count: 'exact' })
        .order('received_at', { ascending: false });

      // Apply filters
      if (webhookType !== 'all') {
        query = query.eq('webhook_type', webhookType);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        const searchPattern = `%${search}%`;
        query = query.or(`webhook_type.ilike.${searchPattern},request_id.ilike.${searchPattern},error_message.ilike.${searchPattern}`);
      }

      // Apply pagination
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      try {
        const { data, error, count } = await query;
        
        if (error) {
          console.error('Error fetching webhook logs:', error);
          throw error;
        }

        // Process the data to match our WebhookLog type
        const processedLogs = data.map((log: any) => ({
          ...log,
          relationship: log.relationship || {
            event_id: null,
            recording_id: null,
            notetaker_id: null
          }
        }));

        return {
          logs: processedLogs as WebhookLog[],
          totalCount: count || 0
        };
      } catch (error) {
        console.error('Error in webhook logs query:', error);
        throw error;
      }
    },
    enabled: !!userId,
    retry: 1, // Only retry once to avoid excessive retries on RLS policy issues
  });
}
