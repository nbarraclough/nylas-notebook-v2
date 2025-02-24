
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
}

const ITEMS_PER_PAGE = 10;

export function WebhooksSettings({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: webhookLogs, isLoading } = useQuery({
    queryKey: ['webhook_logs', search],
    queryFn: async () => {
      let query = supabase
        .from('webhook_logs')
        .select('*', { count: 'exact' })
        .or(
          `notetaker_id.eq.${userId},` +
          `raw_payload->data->object->user_id.eq.${userId}`
        )
        .order('received_at', { ascending: false });

      if (search) {
        query = query.or(
          `webhook_type.ilike.%${search}%,` +
          `notetaker_id.ilike.%${search}%,` +
          `request_id.ilike.%${search}%,` +
          `status.ilike.%${search}%,` +
          `error_message.ilike.%${search}%`
        );
      }

      // Add pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching webhook logs:', error);
        throw error;
      }

      return {
        logs: data as WebhookLog[],
        totalCount: count || 0
      };
    },
  });

  const totalPages = webhookLogs ? Math.ceil(webhookLogs.totalCount / ITEMS_PER_PAGE) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Webhook Logs</h3>
        <p className="text-sm text-muted-foreground">
          View and search through webhook logs. Search by type, notetaker ID, request ID, status, or error message.
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
              <TableHead>Notetaker ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
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
                  <TableCell className="font-mono">
                    {log.notetaker_id || "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.error_message || "-"}
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
