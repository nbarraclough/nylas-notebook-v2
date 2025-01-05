import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Pin, PinOff } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface EventCardProps {
  event: {
    masterId: string;
    latestEvent: any;
    recordingsCount: number;
    isPinned: boolean;
  };
  onTogglePin: (masterId: string, currentPinned: boolean) => Promise<void>;
}

export function EventCard({ event, onTogglePin }: EventCardProps) {
  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.preventDefault();
          onTogglePin(event.masterId, event.isPinned);
        }}
      >
        {event.isPinned ? (
          <Pin className="h-4 w-4 text-primary fill-primary" />
        ) : (
          <PinOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <Link to={`/recurring-events/${event.masterId}`}>
        <Card className="h-full transition-colors hover:bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {event.isPinned && (
                    <Pin className="h-4 w-4 text-primary fill-primary" />
                  )}
                  <h3 className="text-lg font-semibold">{event.latestEvent.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.recordingsCount} recordings
                </p>
                <p className="text-sm text-muted-foreground">
                  Last occurrence: {format(new Date(event.latestEvent.start_time), "PPp")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}