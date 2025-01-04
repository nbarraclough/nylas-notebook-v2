import { Users } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { EventParticipant, EventOrganizer } from "@/types/calendar";

interface EventParticipantsProps {
  participants: EventParticipant[];
  organizer?: EventOrganizer;
  isInternalMeeting: boolean;
}

export const EventParticipants = ({ participants, organizer, isInternalMeeting }: EventParticipantsProps) => {
  // Filter out the organizer from participants list if they're also in there
  const filteredParticipants = participants.filter(
    participant => participant.email !== organizer?.email
  );

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Users 
          className={`h-4 w-4 inline-block ml-2 ${
            isInternalMeeting 
              ? "text-purple-500 hover:text-purple-600" 
              : "text-blue-500 hover:text-blue-600"
          }`} 
        />
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          {organizer && (
            <div>
              <h4 className="text-sm font-semibold">Host</h4>
              <div className="text-sm text-muted-foreground">
                {organizer.name} ({organizer.email})
              </div>
            </div>
          )}
          {filteredParticipants.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold">Participants</h4>
              <div className="text-sm space-y-1">
                {filteredParticipants.map((participant, index) => (
                  <div key={index} className="text-muted-foreground">
                    {participant.name} ({participant.email})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};