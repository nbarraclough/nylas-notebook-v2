
import { format } from "date-fns";
import { ChevronDown, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebhookLog } from "./types";

interface WebhookLogsTableProps {
  logs: WebhookLog[];
  isLoading: boolean;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
}

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

const formatState = (raw_payload: any) => {
  if (!raw_payload?.previous_state && !raw_payload?.new_state) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      {raw_payload?.previous_state && <Badge variant="outline">{raw_payload.previous_state}</Badge>}
      {raw_payload?.previous_state && raw_payload?.new_state && <ChevronDown className="h-4 w-4" />}
      {raw_payload?.new_state && <Badge>{raw_payload.new_state}</Badge>}
    </div>
  );
};

export function WebhookLogsTable({
  logs,
  isLoading,
  expandedRows,
  toggleRow,
}: WebhookLogsTableProps) {
  return (
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
        ) : logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
              No results found
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => (
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
                  {formatState(log.raw_payload)}
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate text-sm">
                    {log.error_message ? (
                      <span className="text-red-600">{log.error_message}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {log.relationship?.recording_id ? `Recording: ${log.relationship.recording_id} ` : ''}
                        {log.relationship?.event_id ? `Event: ${log.relationship.event_id} ` : ''}
                        {log.relationship?.notetaker_id ? `Notetaker: ${log.relationship.notetaker_id}` : ''}
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
  );
}
