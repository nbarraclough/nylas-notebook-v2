
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface QueueCardProps {
  recording: any;
  event: any;
}

export const QueueCard = ({ recording, event }: QueueCardProps) => {
  if (!event) return null;

  // Format the scheduled time
  const startTime = new Date(event.start_time);
  const formattedTime = formatDistanceToNow(startTime, { addSuffix: true });
  const isScheduledForFuture = startTime > new Date();

  // Format join time if available
  const joinTime = recording.join_time ? new Date(recording.join_time) : null;
  const formattedJoinTime = joinTime 
    ? formatDistanceToNow(joinTime, { addSuffix: true })
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="grid gap-2">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-base">{event.title}</h3>
            <Badge 
              variant="outline" 
              className={`${isScheduledForFuture ? "bg-blue-50" : "bg-green-50"}`}
            >
              {isScheduledForFuture ? "Scheduled" : "Ready to join"}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Starts {formattedTime}
          </div>
          
          {joinTime && (
            <div className="text-sm text-muted-foreground">
              Notetaker will join {formattedJoinTime}
            </div>
          )}
          
          {recording.notetaker_id && (
            <div className="text-xs text-muted-foreground mt-1">
              Notetaker ID: {recording.notetaker_id.substring(0, 8)}...
            </div>
          )}
          
          {event.conference_url && (
            <div className="mt-2">
              <a 
                href={event.conference_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Join meeting
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
