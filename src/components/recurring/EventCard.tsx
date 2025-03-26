
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Video, Users, CalendarClock, Calendar, Crown, ArrowRight, Copy } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const participantsCount = event.latestEvent.participants?.length || 0;
  const nextEventDate = event.nextEvent 
    ? formatDistanceToNow(new Date(event.nextEvent.start_time), { addSuffix: true })
    : "No upcoming events";
  
  // Calculate meeting frequency if there's enough data
  const getFrequencyLabel = () => {
    if (!event.latestEvent || !event.nextEvent) return null;
    const daysDiff = Math.round(
      (new Date(event.nextEvent.start_time).getTime() - new Date(event.latestEvent.start_time).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    if (daysDiff === 7) return "Weekly";
    if (daysDiff === 14) return "Bi-weekly";
    if (daysDiff === 28 || daysDiff === 30) return "Monthly";
    return null;
  };

  const frequencyLabel = getFrequencyLabel();

  // Check if user is the organizer
  const isOrganizer = event.latestEvent.organizer?.email === event.latestEvent.user_email;

  // Copy to clipboard function
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard.`
      });
    });
  };

  return (
    <Link to={`/recurring-event-series/${event.masterId}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer bg-white/80 backdrop-blur-sm border-gray-100">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base line-clamp-2 leading-snug flex items-center gap-2">
              {event.latestEvent.title}
              {isOrganizer && (
                <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {frequencyLabel && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <CalendarClock className="h-3 w-3 mr-1" />
                {frequencyLabel}
              </Badge>
            )}
            <HoverCard>
              <HoverCardTrigger>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 cursor-help">
                  <Users className="h-3 w-3 mr-1" />
                  {participantsCount} {participantsCount === 1 ? 'participant' : 'participants'}
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Meeting Participants</h4>
                  <div className="space-y-1">
                    {event.latestEvent.organizer && (
                      <div className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span className="text-sm">
                          {event.latestEvent.organizer.name || event.latestEvent.organizer.email}
                        </span>
                      </div>
                    )}
                    {event.latestEvent.participants?.map((participant: any, index: number) => (
                      <div key={index} className="text-sm text-muted-foreground pl-5">
                        {participant.name || participant.email}
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
            {event.recordingsCount > 0 && (
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
                <Video className="h-3 w-3 mr-1" />
                {event.recordingsCount} {event.recordingsCount === 1 ? 'recording' : 'recordings'}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Next: {nextEventDate}</span>
            </div>

            {event.notes && event.notes.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {event.notes.length} meeting {event.notes.length === 1 ? 'note' : 'notes'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Add event identifiers section */}
          <div className="pt-2 mt-2 border-t text-xs font-mono text-gray-500">
            <div className="flex items-center justify-between mb-1">
              <span>Master Event ID:</span>
              <div className="flex items-center">
                <code className="bg-gray-100 px-1 py-0.5 rounded">{event.masterId}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 ml-1" 
                  onClick={(e) => {
                    e.preventDefault(); // Prevent link navigation
                    copyToClipboard(event.masterId, "Master Event ID");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Show iCal UID if it exists */}
            {event.latestEvent.ical_uid && (
              <div className="flex items-center justify-between mb-1">
                <span>iCal UID:</span>
                <div className="flex items-center">
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{event.latestEvent.ical_uid}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 ml-1" 
                    onClick={(e) => {
                      e.preventDefault(); // Prevent link navigation
                      copyToClipboard(event.latestEvent.ical_uid, "iCal UID");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
