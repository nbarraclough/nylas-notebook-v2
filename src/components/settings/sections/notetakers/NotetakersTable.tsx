
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NotetakerActions } from "./NotetakerActions";
import type { NotetakerRecord } from "./types";
import { Badge } from "@/components/ui/badge";

interface NotetakersTableProps {
  recordings: NotetakerRecord[];
  isKicking: { [key: string]: boolean };
  isRetrieving: { [key: string]: boolean };
  onKick: (notetakerId: string, recordingId: string) => Promise<void>;
  onRetrieve: (recordingId: string, notetakerId: string, forceRefresh?: boolean) => Promise<void>;
}

export function NotetakersTable({
  recordings,
  isKicking,
  isRetrieving,
  onKick,
  onRetrieve,
}: NotetakersTableProps) {
  const getEventTitle = (record: NotetakerRecord) => {
    if (!record.event) return "Unknown Event";
    if (record.event.manual_meeting?.title) {
      return record.event.manual_meeting.title;
    }
    return record.event.title || "Untitled Event";
  };

  const getFormattedDate = (record: NotetakerRecord) => {
    try {
      if (record.event?.start_time) {
        return format(new Date(record.event.start_time), "MMM d, yyyy 'at' h:mm a");
      } else if (record.created_at) {
        return format(new Date(record.created_at), "MMM d, yyyy 'at' h:mm a") + " (created)";
      }
      return "Unknown date";
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  const getMeetingTypeContent = (record: NotetakerRecord) => {
    if (!record.event) {
      return (
        <Badge variant="outline" className="font-normal text-yellow-600 border-yellow-600">
          Unknown Type
        </Badge>
      );
    }
    
    const type = record.event.manual_meeting ? 'Manual Meeting' : 'Calendar Event';
    const badgeVariant = record.event.manual_meeting ? 'outline' : 'secondary';
    
    return (
      <Badge variant={badgeVariant} className="font-normal">
        {type}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Notetaker ID</TableHead>
            <TableHead className="w-[250px]">Event</TableHead>
            <TableHead className="w-[200px]">Time</TableHead>
            <TableHead className="w-[140px]">Type</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recordings?.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-mono text-xs truncate max-w-[180px]">
                {record.notetaker_id}
              </TableCell>
              <TableCell className="font-medium truncate max-w-[250px]">
                {getEventTitle(record)}
              </TableCell>
              <TableCell>
                {getFormattedDate(record)}
              </TableCell>
              <TableCell>
                {getMeetingTypeContent(record)}
              </TableCell>
              <TableCell className="text-center">
                <NotetakerActions
                  notetakerId={record.notetaker_id}
                  recordingId={record.id}
                  status={record.status}
                  isKicking={isKicking[record.id]}
                  isRetrieving={isRetrieving[record.id]}
                  onKick={() => onKick(record.notetaker_id, record.id)}
                  onRetrieve={(forceRefresh) => onRetrieve(record.id, record.notetaker_id, forceRefresh)}
                />
              </TableCell>
            </TableRow>
          ))}
          {recordings?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No notetakers found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
