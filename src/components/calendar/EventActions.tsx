import { Button } from "@/components/ui/button";
import { RecordingToggle } from "./RecordingToggle";

interface EventActionsProps {
  conferenceUrl: string | null;
  isQueued: boolean;
  eventId: string;
  userId: string;
  scheduledFor: string;
  nylasGrantId?: string | null;
  onToggle: (newState: boolean) => void;
  isPast: boolean;
  isCalendarRoute: boolean;
}

export const EventActions = ({
  conferenceUrl,
  isQueued,
  eventId,
  userId,
  scheduledFor,
  nylasGrantId,
  onToggle,
  isPast,
  isCalendarRoute
}: EventActionsProps) => {
  if (isPast) return null;

  return (
    <div className="flex flex-col gap-2">
      {conferenceUrl && (
        <RecordingToggle
          isQueued={isQueued}
          eventId={eventId}
          userId={userId}
          hasConferenceUrl={!!conferenceUrl}
          scheduledFor={scheduledFor}
          nylasGrantId={nylasGrantId}
          onToggle={onToggle}
        />
      )}
      
      {conferenceUrl && isCalendarRoute && (
        <div className="flex justify-start">
          <Button 
            variant="outline"
            size="sm"
            className="hover:bg-accent"
            asChild
          >
            <a 
              href={conferenceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Join meeting
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};