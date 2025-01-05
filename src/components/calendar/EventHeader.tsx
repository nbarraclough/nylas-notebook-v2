import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield, ExternalLink } from "lucide-react";
import { EventParticipants } from "./EventParticipants";
import { RecordingToggle } from "./RecordingToggle";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";

interface EventHeaderProps {
  title: string;
  startTime: string;
  endTime: string;
  participants: EventParticipant[];
  organizer: EventOrganizer | null;
  isInternalMeeting: boolean;
  conferenceUrl: string | null;
  isQueued: boolean;
  eventId: string;
  userId: string;
  scheduledFor: string;
  nylasGrantId?: string | null;
  onToggle: (newState: boolean) => void;
  isPast: boolean;
  htmlLink?: string | null;
}

export const EventHeader = ({ 
  title, 
  startTime, 
  endTime, 
  participants, 
  organizer,
  isInternalMeeting,
  conferenceUrl,
  isQueued,
  eventId,
  userId,
  scheduledFor,
  nylasGrantId,
  onToggle,
  isPast,
  htmlLink
}: EventHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <EventParticipants 
            participants={participants} 
            organizer={organizer}
            isInternalMeeting={isInternalMeeting}
          />
        </div>
        <div className="min-w-0 flex-1">
          {htmlLink ? (
            <a 
              href={htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 hover:text-blue-600 break-words"
            >
              <h3 className="font-semibold leading-snug">{title}</h3>
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ) : (
            <h3 className="font-semibold leading-snug break-words">{title}</h3>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")} - {format(new Date(endTime), "h:mm a")}
          </p>
        </div>
      </div>
      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
        <Badge 
          variant={isInternalMeeting ? "secondary" : "outline"}
          className={`text-xs ${isInternalMeeting ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
        >
          {isInternalMeeting ? (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Internal
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 mr-1" />
              External
            </>
          )}
        </Badge>
        {!isPast && conferenceUrl && (
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
      </div>
    </div>
  );
};