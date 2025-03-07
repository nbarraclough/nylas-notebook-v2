import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoPlayer, type VideoPlayerRef } from "@/components/recordings/player/VideoPlayer";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { VideoHeader } from "./VideoHeader";
import { EventDescription } from "@/components/calendar/EventDescription";
import { useRecordingData } from "./video/useRecordingData";
import { useProfileData } from "./video/useProfileData";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RecordingStatus } from "@/components/recordings/RecordingStatus";

interface VideoPlayerViewProps {
  recordingId: string;
  onClose: () => void;
}

interface Organizer {
  email?: string;
  name?: string;
}

export function VideoPlayerView({ recordingId, onClose }: VideoPlayerViewProps) {
  const queryClient = useQueryClient();
  const { data: recording, isLoading: isRecordingLoading } = useRecordingData(recordingId);
  const { data: profile } = useProfileData();
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const { toast } = useToast();

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.pause();
        videoPlayerRef.current.cleanup();
      }
      queryClient.removeQueries({ queryKey: ['recording', recordingId] });
      onClose();
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.pause();
        videoPlayerRef.current.cleanup();
      }
    };
  }, []);

  const isInternalMeeting = () => {
    if (!recording?.event?.organizer || !recording.event.participants) {
      return false;
    }

    const organizerEmail = typeof recording.event.organizer === 'object' && recording.event.organizer !== null
      ? (recording.event.organizer as { email: string }).email
      : '';
    
    if (!organizerEmail) return false;
    
    const organizerDomain = organizerEmail.split('@')[1];
    const participants = Array.isArray(recording.event.participants) ? recording.event.participants : [];

    return participants.every((participant: Json) => {
      if (typeof participant === 'object' && participant !== null && 'email' in participant) {
        const participantEmail = (participant as { email: string }).email;
        return participantEmail.split('@')[1] === organizerDomain;
      }
      if (typeof participant === 'string') {
        return participant.split('@')[1] === organizerDomain;
      }
      return false;
    });
  };

  const dialogContentClass = cn(
    "max-w-6xl w-[95vw] p-0",
    "bg-gradient-to-br from-white to-gray-50/80",
    "backdrop-blur-sm border border-gray-100",
    "dark:from-gray-900 dark:to-gray-900/80 dark:border-gray-800",
    "[&_.close-button]:hidden"
  );

  if (isRecordingLoading) {
    return (
      <Dialog open={true} onOpenChange={handleDialogClose}>
        <DialogContent className={dialogContentClass}>
          <div className="animate-pulse p-6 space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="aspect-video bg-muted rounded" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!recording) {
    return (
      <Dialog open={true} onOpenChange={handleDialogClose}>
        <DialogContent className={dialogContentClass}>
          <div className="p-6">
            <p className="text-center text-muted-foreground">Recording not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const participants: EventParticipant[] = recording.event?.manual_meeting
    ? [{ name: profile?.email?.split('@')[0] || '', email: profile?.email || '' }]
    : Array.isArray(recording.event?.participants)
      ? recording.event.participants.map((p: Json) => {
          if (typeof p === 'object' && p !== null) {
            const participant = p as Organizer;
            return {
              name: participant.name || participant.email?.split('@')[0] || '',
              email: participant.email || ''
            };
          }
          return {
            name: typeof p === 'string' ? p.split('@')[0] : '',
            email: typeof p === 'string' ? p : ''
          };
        })
      : [];

  const publicShare = recording.video_shares?.find(share => share.share_type === 'external');
  const shareUrl = publicShare ? `${window.location.origin}/shared/${publicShare.external_token}` : null;
  const internal = isInternalMeeting();

  const videoUrl = recording.mux_playback_id 
    ? `https://stream.mux.com/${recording.mux_playback_id}.m3u8` 
    : null;

  return (
    <Dialog open={true} onOpenChange={handleDialogClose}>
      <DialogContent className={dialogContentClass}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <VideoHeader
              title={recording.event?.title || ''}
              isInternal={internal}
              shareUrl={shareUrl}
              participants={participants}
              grantId={profile?.nylas_grant_id}
              recordingId={recordingId}
              onClose={() => handleDialogClose(false)}
              startTime={recording.event?.start_time}
              endTime={recording.event?.end_time}
              onShareUpdate={() => queryClient.invalidateQueries({ queryKey: ['recording', recordingId] })}
              ownerEmail={recording.owner_email}
              userId={recording.user_id}
              manualMeetingId={recording.event?.manual_meeting?.id}
            />
            <RecordingStatus status={recording.status} meetingState={recording.meeting_state} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
              <VideoPlayer
                ref={videoPlayerRef}
                recordingId={recordingId}
                videoUrl={videoUrl}
                recordingUrl={null}
                title={recording.event?.title || ''}
                participants={participants}
                grantId={profile?.nylas_grant_id}
                notetakerId={recording.notetaker_id}
                muxPlaybackId={recording.mux_playback_id}
              />
            </div>
            
            {recording.transcript_content && (
              <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm">
                <TranscriptSection 
                  content={recording.transcript_content} 
                  videoRef={videoPlayerRef}
                />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Notetaker ID:</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded">{recording.notetaker_id || 'N/A'}</code>
                {recording.notetaker_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(recording.notetaker_id!, 'Notetaker ID')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Event ID:</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded">{recording.event?.id || 'N/A'}</code>
                {recording.event?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(recording.event.id!, 'Event ID')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {recording.event?.description && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-3">Description</h3>
              <EventDescription description={recording.event.description} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
