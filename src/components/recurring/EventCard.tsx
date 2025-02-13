
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface EventCardProps {
  event: {
    masterId: string;
    latestEvent: any;
    nextEvent: any;
    recordingsCount: number;
    notes?: Array<{ content: string; masterId: string; }>;
  };
}

export function EventCard({ event }: EventCardProps) {
  const participantsCount = event.latestEvent.participants?.length || 0;
  const nextEventDate = event.nextEvent 
    ? formatDistanceToNow(new Date(event.nextEvent.start_time), { addSuffix: true })
    : "No upcoming events";

  return (
    <Link to={`/recurring-event-series/${event.masterId}`}>
      <Card className="h-full hover:shadow-md transition-all cursor-pointer">
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
          {event.notes && event.notes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {event.notes.length} {event.notes.length === 1 ? 'note' : 'notes'}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
