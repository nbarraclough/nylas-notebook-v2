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

interface NotetakersTableProps {
  recordings: NotetakerRecord[];
  isKicking: { [key: string]: boolean };
  isRetrieving: { [key: string]: boolean };
  onKick: (notetakerId: string, recordingId: string) => void;
  onRetrieve: (recordingId: string, notetakerId: string) => void;
}

export function NotetakersTable({
  recordings,
  isKicking,
  isRetrieving,
  onKick,
  onRetrieve,
}: NotetakersTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notetaker ID</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recordings?.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-mono text-sm">
                {record.notetaker_id}
              </TableCell>
              <TableCell>
                {record.event.manual_meeting ? record.event.manual_meeting.title : record.event.title}
              </TableCell>
              <TableCell>
                {format(new Date(record.event.start_time), "MMM d, yyyy 'at' h:mm a")}
              </TableCell>
              <TableCell>
                {record.event.manual_meeting ? 'Manual Meeting' : 'Calendar Event'}
              </TableCell>
              <TableCell>
                <NotetakerActions
                  notetakerId={record.notetaker_id}
                  recordingId={record.id}
                  isKicking={isKicking[record.id]}
                  isRetrieving={isRetrieving[record.id]}
                  onKick={() => onKick(record.notetaker_id, record.id)}
                  onRetrieve={() => onRetrieve(record.id, record.notetaker_id)}
                />
              </TableCell>
            </TableRow>
          ))}
          {recordings?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No notetakers found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}