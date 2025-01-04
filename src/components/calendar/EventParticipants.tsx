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
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Users 
          className={`mt-1 ${
            isInternalMeeting 
              ? "text-purple-500 hover:text-purple-600" 
              : "text-blue-500 hover:text-blue-600"
          }`} 
        />
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Participants</h4>
          {organizer && (
            <div className="text-sm text-muted-foreground font-medium">
              Organizer: {organizer.name} ({organizer.email})
            </div>
          )}
          <div className="text-sm space-y-1">
            {participants.map((participant, index) => (
              <div key={index} className="text-muted-foreground">
                {participant.name} ({participant.email})
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};