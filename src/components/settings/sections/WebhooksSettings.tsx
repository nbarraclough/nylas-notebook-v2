
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PaginationControls } from "@/components/recurring/PaginationControls";

interface WebhookLog {
  id: string;
  received_at: string;
  webhook_type: string;
  notetaker_id: string | null;
  grant_id: string | null;
  request_id: string;
  status: string;
  error_message: string | null;
  raw_payload: any;
  event_id: string | null;
  recording_id: string | null;
  previous_state: string | null;
  new_state: string | null;
}

const ITEMS_PER_PAGE = 10;

export function WebhooksSettings({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: webhookLogs, isLoading } = useQuery({
    queryKey: ['webhook_logs', search, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('webhook_logs')
        .select('*', { count: 'exact' });

      // Base filters for user's logs
      const filters = [
        { column: 'notetaker_id', operator: 'eq', value: userId },
        `raw_payload->data->object->user_id=eq.${userId}`
      ];
      query = query.or(filters.join(','));

      // Search filters if search term exists
      if (search) {
        const searchPattern = `%${search}%`;
        const searchFilters = [
          { column: 'webhook_type', operator: 'ilike', value: searchPattern },
          { column: 'notetaker_id', operator: 'ilike', value: searchPattern },
          { column: 'request_id', operator: 'ilike', value: searchPattern },
          { column: 'status', operator: 'ilike', value: searchPattern },
          { column: 'error_message', operator: 'ilike', value: searchPattern },
          { column: 'previous_state', operator: 'ilike', value: searchPattern },
          { column: 'new_state', operator: 'ilike', value: searchPattern }
        ];
        query = query.or(searchFilters.map(f => `${f.column}.${f.operator}.${f.value}`).join(','));
      }

      // Apply sorting and pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query
        .order('received_at', { ascending: false })
        .range(from, from + ITEMS_PER_PAGE - 1);

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
  });

  const totalPages = webhookLogs ? Math.ceil(webhookLogs.totalCount / ITEMS_PER_PAGE) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Webhook Logs</h3>
        <p className="text-sm text-muted-foreground">
          View and search through webhook logs. Search by type, status, state changes, and more.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search webhooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>State Change</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : webhookLogs?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No results
                </TableCell>
              </TableRow>
            ) : (
              webhookLogs?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono">
                    {format(new Date(log.received_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell>{log.webhook_type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.previous_state && log.new_state ? (
                      <span className="text-xs">
                        {log.previous_state} → {log.new_state}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate text-xs">
                      {log.error_message ? (
                        <span className="text-red-600">{log.error_message}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {log.recording_id ? `Recording: ${log.recording_id} ` : ''}
                          {log.event_id ? `Event: ${log.event_id} ` : ''}
                          {log.notetaker_id ? `Notetaker: ${log.notetaker_id}` : ''}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {webhookLogs?.logs.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
