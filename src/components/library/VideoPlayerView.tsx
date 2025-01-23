import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer, type VideoPlayerRef } from "@/components/recordings/player/VideoPlayer";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { VideoHeader } from "./VideoHeader";
import { EventDescription } from "@/components/calendar/EventDescription";
import { useRecordingData } from "./video/useRecordingData";
import { useProfileData } from "./video/useProfileData";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";
import { useRef, useEffect } from "react";

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

  // Enhanced cleanup effect
  useEffect(() => {
    return () => {
      if (videoPlayerRef.current) {
        // Ensure video is paused and cleaned up
        videoPlayerRef.current.pause();
        videoPlayerRef.current.cleanup();
      }
    };
  }, []);

  // Also cleanup when recordingId changes
  useEffect(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.cleanup();
    }
  }, [recordingId]);

  const handleClose = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.cleanup();
    }
    onClose();
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
            title={recording.event?.title || ''}
            isInternal={internal}
            shareUrl={shareUrl}
            participants={participants}
            grantId={profile?.nylas_grant_id}
            recordingId={recordingId}
            onClose={handleClose}
            startTime={recording.event?.start_time}
            endTime={recording.event?.end_time}
            onShareUpdate={handleShareUpdate}
            ownerEmail={recording.owner_email}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <VideoPlayer
                ref={videoPlayerRef}
                recordingId={recordingId}
                videoUrl={null}
                recordingUrl={null}
                title={recording.event?.title || ''}
                participants={participants}
                grantId={profile?.nylas_grant_id}
                notetakerId={recording.notetaker_id}
                muxPlaybackId={recording.mux_playback_id}
              />
            </div>
            
            {recording.transcript_content && (
              <TranscriptSection 
                content={recording.transcript_content} 
                videoRef={videoPlayerRef}
              />
            )}
          </div>

          {recording.event?.description && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-3">Description</h3>
              <EventDescription description={recording.event.description} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}