import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { EventCard } from "./EventCard";
import { RecurringRecordingToggle } from "./RecurringRecordingToggle";
import { useProfile } from "@/hooks/use-profile";
import type { Event } from "@/types/calendar";

interface EventListProps {
  events: Event[];
  masterId: string;
  isLoading?: boolean;
}

export function EventList({ events, masterId, isLoading }: EventListProps) {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecurringRecordingToggle masterId={masterId} />
      </div>
      
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          grantId={profile?.nylas_grant_id}
          onRecordingSelect={(id) => navigate(`/library/${id}`)}
        />
      ))}
    </div>
  );
}