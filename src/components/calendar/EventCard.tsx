import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Users } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Event = Database['public']['Tables']['events']['Row'];

interface EventCardProps {
  event: Event;
}

export const EventCard = ({ event }: EventCardProps) => {
  const participants = Array.isArray(event.participants) ? event.participants : [];
  const isInternalMeeting = participants.every(participant => {
    const organizerDomain = event.organizer?.email?.split('@')[1];
    const participantDomain = participant.email?.split('@')[1];
    return organizerDomain && participantDomain && organizerDomain === participantDomain;
  });

  const formatTimeRange = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d, yyyy, h:mm a')} - ${format(new Date(end), 'h:mm a')}`;
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
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
            
            <div>
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {formatTimeRange(event.start_time, event.end_time)}
              </p>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Record</span>
            <Switch />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};