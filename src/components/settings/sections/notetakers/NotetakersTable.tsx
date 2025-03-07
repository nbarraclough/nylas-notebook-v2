
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
    // If it's a manual meeting and has a title, use that
    if (record.event.manual_meeting?.title) {
      return record.event.manual_meeting.title;
    }
    // Otherwise use the event title
    return record.event.title;
  };

  const getMeetingTypeContent = (record: NotetakerRecord) => {
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
                {format(new Date(record.event.start_time), "MMM d, yyyy 'at' h:mm a")}
              </TableCell>
              <TableCell>
                {getMeetingTypeContent(record)}
              </TableCell>
              <TableCell className="text-center">
                <NotetakerActions
                  notetakerId={record.notetaker_id}
                  recordingId={record.id}
                  status=""
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
