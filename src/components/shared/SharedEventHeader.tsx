
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useVideoDownload } from "@/hooks/use-video-download";
import type { EventParticipant } from "@/types/calendar";

interface SharedEventHeaderProps {
  title: string;
  startTime?: string;
  endTime?: string;
  participants: EventParticipant[];
  muxPlaybackId?: string | null;
}

export function SharedEventHeader({ 
  title, 
  startTime, 
  endTime, 
  participants,
  muxPlaybackId
}: SharedEventHeaderProps) {
  const { isDownloading, downloadVideo } = useVideoDownload();

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        
        {startTime && endTime && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")} - {format(new Date(endTime), "h:mm a")}
          </p>
        )}
        
        {participants && participants.length > 1 && (
          <HoverCard>
            <HoverCardTrigger>
              <Badge className="cursor-pointer flex items-center gap-1">
                <Users className="w-3 h-3" />
                {participants.length} participants
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
        )}
      </div>
      
      {muxPlaybackId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadVideo(muxPlaybackId, title)}
          disabled={isDownloading}
          className="flex items-center gap-2"
        >
          {isDownloading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>Download</span>
        </Button>
      )}
    </div>
  );
}
