
import { Badge } from "@/components/ui/badge";
import { X, Shield, Globe, Users, Pencil, Check, Share2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ShareVideoDialog } from "@/components/recordings/ShareVideoDialog";
import { ShareViaEmailButton } from "@/components/recordings/email/ShareViaEmailButton";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { EventParticipant } from "@/types/calendar";

interface VideoHeaderProps {
  title: string;
  isInternal: boolean;
  shareUrl: string | null;
  participants: EventParticipant[];
  grantId?: string;
  recordingId: string;
  onClose: () => void;
  startTime?: string;
  endTime?: string;
  onShareUpdate?: () => void;
  ownerEmail?: string;
  userId?: string;
  manualMeetingId?: string;
}

export function VideoHeader({
  title,
  isInternal,
  shareUrl,
  participants,
  grantId,
  recordingId,
  onClose,
  startTime,
  endTime,
  onShareUpdate,
  ownerEmail,
  userId,
  manualMeetingId
}: VideoHeaderProps) {
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
      
      if (onShareUpdate) {
        onShareUpdate();
      }
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
    <div className="flex items-start justify-between relative">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
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
              <h2 className="text-2xl font-semibold">{title}</h2>
              {manualMeetingId && userId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {startTime && endTime && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {format(new Date(startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")} - {format(new Date(endTime), "h:mm a")}
            </p>
            {ownerEmail && (
              <p className="text-sm text-muted-foreground">
                Recording owner: {ownerEmail}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Badge 
            variant={isInternal ? "secondary" : "outline"}
            className={`text-xs ${isInternal ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
          >
            {isInternal ? (
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
          
          {participants && participants.length > 1 && (
            <HoverCard>
              <HoverCardTrigger>
                <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer">
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
      </div>
      <div className="flex items-center gap-2">
        <ShareVideoDialog recordingId={recordingId} onShareUpdate={onShareUpdate}>
          <Button variant="outline" size="icon" className="rounded-full">
            <Share2 className="h-4 w-4" />
          </Button>
        </ShareVideoDialog>
        {shareUrl && (
          <ShareViaEmailButton
            shareUrl={shareUrl}
            eventTitle={title}
            participants={participants}
            recordingId={recordingId}
          >
            <Button variant="outline" size="icon" className="rounded-full">
              <Mail className="h-4 w-4" />
            </Button>
          </ShareViaEmailButton>
        )}
        <Button 
          variant="outline"
          size="icon" 
          onClick={onClose}
          className="rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
