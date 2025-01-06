import { Card, CardContent } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle, Check, Loader } from "lucide-react";
import type { NotetakerQueue } from "@/integrations/supabase/types/notetaker-queue";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";
import { useState, useEffect } from "react";

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
  const [timeUntilStart, setTimeUntilStart] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const startTime = new Date(queueItem.scheduled_for);
      if (startTime > now) {
        setTimeUntilStart(formatDistanceToNow(startTime, { addSuffix: true }));
      } else {
        setTimeUntilStart("Processing soon...");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [queueItem.scheduled_for]);

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
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <h3 className="font-medium line-clamp-2">{queueItem.event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {formatTimeRange(queueItem.event.start_time, queueItem.event.end_time)}
              </p>
              <p className="text-sm font-medium text-blue-600">
                Notetaker will join {timeUntilStart}
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {getStatusIcon()}
              <span className="text-sm capitalize hidden sm:inline">{queueItem.status}</span>
            </div>
          </div>

          {queueItem.event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {queueItem.event.description}
            </p>
          )}

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Organizer:</span>{' '}
              <span className="text-muted-foreground break-all">
                {organizer?.name || organizer?.email || 'Unknown'}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Participants:</span>{' '}
              <span className="text-muted-foreground line-clamp-2 break-all">
                {participants.length > 0
                  ? participants.map(p => p.name || p.email).join(', ')
                  : 'No participants'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};