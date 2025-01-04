import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, AlertCircle, Check, Loader } from "lucide-react";
import type { NotetakerQueue } from "@/integrations/supabase/types/notetaker-queue";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";

interface QueueCardProps {
  queueItem: NotetakerQueue & {
    event: {
      title: string;
      description: string | null;
      start_time: string;
      end_time: string;
      conference_url: string | null;
      participants: any[];
      organizer: any;
    };
  };
}

export const QueueCard = ({ queueItem }: QueueCardProps) => {
  const participants = (queueItem.event.participants || []).map(p => ({
    name: p.name || '',
    email: p.email || ''
  })) as EventParticipant[];

  const organizer = queueItem.event.organizer ? {
    name: (queueItem.event.organizer as any).name || '',
    email: (queueItem.event.organizer as any).email || ''
  } as EventOrganizer : null;

  const getStatusIcon = () => {
    switch (queueItem.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d, yyyy, h:mm a')} - ${format(new Date(end), 'h:mm a')}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{queueItem.event.title}</h3>
            <p className="text-sm text-muted-foreground">
              {formatTimeRange(queueItem.event.start_time, queueItem.event.end_time)}
            </p>
            {queueItem.event.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {queueItem.event.description}
              </p>
            )}
            <div className="mt-2">
              <p className="text-sm">
                <span className="font-medium">Organizer:</span>{' '}
                {organizer?.name || organizer?.email || 'Unknown'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Participants:</span>{' '}
                {participants.length > 0
                  ? participants.map(p => p.name || p.email).join(', ')
                  : 'No participants'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm capitalize">{queueItem.status}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};