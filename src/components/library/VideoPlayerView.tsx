import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer, type VideoPlayerRef } from "@/components/recordings/player/VideoPlayer";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { VideoHeader } from "./VideoHeader";
import { EventDescription } from "@/components/calendar/EventDescription";
import { useRecordingData } from "./video/useRecordingData";
import { useProfileData } from "./video/useProfileData";
import { useVideoRefresh } from "./video/useVideoRefresh";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

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
  const { recording, isLoading: isRecordingLoading } = useRecordingData(recordingId);
  const { data: profile } = useProfileData();
  const { refreshMedia, isRefreshing } = useVideoRefresh(recordingId, recording?.notetaker_id);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  // Refresh media when component mounts
  useEffect(() => {
    if (recording?.notetaker_id) {
      refreshMedia();
    }
  }, [recording?.notetaker_id]);

  const handleClose = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
    }
    onClose();
  };

  const isInternalMeeting = () => {
    const organizer = recording?.event?.organizer as Organizer | null;
    const organizerEmail = organizer?.email || profile?.email;
    
    if (!organizerEmail || !Array.isArray(recording?.event?.participants)) return false;
    
    const organizerDomain = organizerEmail.split('@')[1];
    return recording.event.participants.every((participant: Json) => {
      let participantEmail: string | undefined;
      
      if (typeof participant === 'object' && participant !== null) {
        participantEmail = (participant as Organizer).email;
      } else if (typeof participant === 'string') {
        participantEmail = participant;
      }
      
      if (!participantEmail) return false;
      
      const participantDomain = participantEmail.split('@')[1];
      return participantDomain === organizerDomain;
    });
  };

  const handleShareUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['recording', recordingId] });
  };

  if (isRecordingLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-6xl mx-4">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="aspect-video bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-6xl mx-4">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Recording not found</p>
          </CardContent>
        </Card>
      </div>
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-6xl mx-4">
        <CardContent className="p-6 space-y-6">
          <VideoHeader
            title={recording?.event?.title || ''}
            isInternal={internal}
            shareUrl={shareUrl}
            participants={participants}
            grantId={profile?.nylas_grant_id}
            recordingId={recordingId}
            onClose={handleClose}
            startTime={recording?.event?.start_time}
            endTime={recording?.event?.end_time}
            onShareUpdate={handleShareUpdate}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
              {isRefreshing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Refreshing video...</p>
                  </div>
                </div>
              ) : null}
              <VideoPlayer
                ref={videoPlayerRef}
                recordingId={recordingId}
                videoUrl={recording?.video_url}
                recordingUrl={recording?.recording_url}
                title={recording?.event?.title || ''}
                participants={participants}
                grantId={profile?.nylas_grant_id}
                notetakerId={recording?.notetaker_id}
                onRefreshMedia={refreshMedia}
              />
            </div>
            
            {recording?.transcript_content && (
              <TranscriptSection content={recording.transcript_content} />
            )}
          </div>

          {recording?.event?.description && (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-medium">Description</h3>
              <EventDescription description={recording.event.description} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}