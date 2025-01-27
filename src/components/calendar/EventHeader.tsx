import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield, ExternalLink, Check, X, Pencil } from "lucide-react";
import { EventParticipants } from "./EventParticipants";
import { RecordingToggle } from "./RecordingToggle";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  manualMeetingId?: string | null;
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
  htmlLink,
  manualMeetingId
}: EventHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const { toast } = useToast();

  const handleUpdateTitle = async () => {
    try {
      const { error } = await supabase
        .from('manual_meetings')
        .update({ title: editedTitle })
        .eq('id', manualMeetingId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting title updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update meeting title",
        variant: "destructive",
      });
    }
  };

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
          {isEditing && manualMeetingId ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="h-8"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUpdateTitle}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditedTitle(title);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
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
              {manualMeetingId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
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