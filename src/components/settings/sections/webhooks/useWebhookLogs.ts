
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
        .select('*', { count: 'exact' })
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
        const searchColumns = [
          'webhook_type',
          'notetaker_id',
          'request_id',
          'error_message',
          'previous_state',
          'new_state'
        ];
        
        const searchConditions = searchColumns
          .map(column => `${column}.ilike.${searchPattern}`)
          .join(',');
        
        query = query.or(searchConditions);
      }

      // Apply pagination
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      try {
        const { data, error, count } = await query;
        
        if (error) {
          console.error('Error fetching webhook logs:', error);
          throw error;
        }

        return {
          logs: data as WebhookLog[],
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
