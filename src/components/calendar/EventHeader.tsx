import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield } from "lucide-react";
import { EventParticipants } from "./EventParticipants";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";

interface EventHeaderProps {
  title: string;
  startTime: string;
  endTime: string;
  participants: unknown;
  organizer: unknown;
  isInternalMeeting: boolean;
}

export const EventHeader = ({ 
  title, 
  startTime, 
  endTime, 
  participants, 
  organizer,
  isInternalMeeting 
}: EventHeaderProps) => {
  // Parse organizer and participants with type checking
  const parseParticipants = (data: unknown): EventParticipant[] => {
    if (Array.isArray(data)) {
      return data.filter((item): item is EventParticipant => 
        typeof item === 'object' && 
        item !== null && 
        'email' in item && 
        'name' in item
      );
    }
    return [];
  };

  const parseOrganizer = (data: unknown): EventOrganizer | null => {
    if (typeof data === 'object' && data !== null && 'email' in data && 'name' in data) {
      return data as EventOrganizer;
    }
    return null;
  };

  return (
    <div className="flex justify-between items-start">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <EventParticipants 
            participants={parseParticipants(participants)} 
            organizer={parseOrganizer(organizer)}
            isInternalMeeting={isInternalMeeting}
          />
        </div>
        <div>
          <h3 className="font-semibold leading-snug">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(startTime), "MMM d, yyyy 'at' h:mm a")} - {format(new Date(endTime), "h:mm a")}
          </p>
        </div>
      </div>
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
    </div>
  );
};