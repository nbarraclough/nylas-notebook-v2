
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const WEBHOOK_TYPES = [
  "all",
  "notetaker.status_updated",
  "notetaker.meeting_state",
  "notetaker.media",
  "event.created",
  "event.updated",
  "event.deleted",
];

const STATUS_TYPES = ["all", "success", "error"];

export function WebhooksSettings({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [webhookType, setWebhookType] = useState("all");
  const [status, setStatus] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const { data: webhookLogs, isLoading } = useQuery({
    queryKey: ['webhook_logs', search, currentPage, webhookType, status],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      
      let query = supabase
        .from('webhook_logs')
        .select('*', { count: 'exact' })
        .or(`notetaker_id.eq.${userId},raw_payload->data->object->user_id.eq.${userId}`)
        .order('received_at', { ascending: false });

      // Apply webhook type filter
      if (webhookType !== 'all') {
        query = query.eq('webhook_type', webhookType);
      }

      // Apply status filter
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply search within user's results
      if (search) {
        query = query.or(`webhook_type.ilike.%${search}%,notetaker_id.ilike.%${search}%,request_id.ilike.%${search}%,error_message.ilike.%${search}%,previous_state.ilike.%${search}%,new_state.ilike.%${search}%`);
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
  });

  const totalPages = webhookLogs ? Math.ceil(webhookLogs.totalCount / ITEMS_PER_PAGE) : 1;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatState = (prev: string | null, next: string | null) => {
    if (!prev && !next) return null;
    return (
      <div className="flex items-center gap-2 text-sm">
        {prev && <Badge variant="outline">{prev}</Badge>}
        {prev && next && <ChevronDown className="h-4 w-4" />}
        {next && <Badge>{next}</Badge>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Webhook Logs</h3>
        <p className="text-sm text-muted-foreground">
          View and search through webhook logs. Filter by type, status, and search across all fields.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search webhooks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={webhookType} onValueChange={setWebhookType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Webhook type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {WEBHOOK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : webhookLogs?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              webhookLogs?.logs.map((log) => (
                <>
                  <TableRow key={log.id}>
                    <TableCell className="font-mono">
                      {format(new Date(log.received_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{log.webhook_type}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatState(log.previous_state, log.new_state)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm">
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(log.id)}
                      >
                        {expandedRows.has(log.id) ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(log.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50">
                        <div className="p-4">
                          <pre className="whitespace-pre-wrap text-sm">
                            {JSON.stringify(log.raw_payload, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
