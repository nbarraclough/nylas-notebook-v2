
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface EventCardProps {
  event: {
    masterId: string;
    latestEvent: any;
    nextEvent: any;
    recordingsCount: number;
  };
}

export function EventCard({ event }: EventCardProps) {
  const participantsCount = event.latestEvent.participants?.length || 0;
  const nextEventDate = event.nextEvent 
    ? formatDistanceToNow(new Date(event.nextEvent.start_time), { addSuffix: true })
    : "No upcoming events";

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base line-clamp-2">
            {event.latestEvent.title}
          </CardTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {participantsCount} {participantsCount === 1 ? 'participant' : 'participants'}
          </Badge>
          {event.recordingsCount > 0 && (
            <Badge variant="outline">
              {event.recordingsCount} {event.recordingsCount === 1 ? 'recording' : 'recordings'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Next: {nextEventDate}
        </p>
      </CardContent>
    </Card>
  );
}
