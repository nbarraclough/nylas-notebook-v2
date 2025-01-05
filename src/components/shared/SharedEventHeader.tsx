import { format } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { EventParticipant } from "@/types/calendar";

interface SharedEventHeaderProps {
  title: string;
  startTime: string;
  endTime: string;
  participants: EventParticipant[];
}

export function SharedEventHeader({ title, startTime, endTime, participants }: SharedEventHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")} - {format(new Date(endTime), "h:mm a")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer">
                  <Users className="w-3 h-3" />
                  {participants?.length || 0} participants
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Participants</h4>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}