import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/recordings/player/VideoPlayer";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { VideoHeader } from "./VideoHeader";
import { LoadingVideoPlayer } from "./LoadingVideoPlayer";
import { ErrorVideoPlayer } from "./ErrorVideoPlayer";
import { VideoDescription } from "./VideoDescription";
import { useRecordingMedia } from "@/hooks/use-recording-media";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";

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
  const { refreshMedia } = useRecordingMedia();

  const { data: recording, isLoading } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      // First refresh the media URL
      const { data: existingRecording } = await supabase
        .from('recordings')
        .select('notetaker_id')
        .eq('id', recordingId)
        .single();

      if (existingRecording?.notetaker_id) {
        console.log('Refreshing media URL for recording:', recordingId);
        await refreshMedia(recordingId, existingRecording.notetaker_id);
      }

      // Then fetch the full recording data
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer,
            manual_meeting:manual_meetings (
              user_id
            )
          ),
          video_shares (
            id,
            share_type,
            external_token
          )
        `)
        .eq('id', recordingId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('nylas_grant_id, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

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

  if (isLoading) return <LoadingVideoPlayer />;
  if (!recording) return <ErrorVideoPlayer />;

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
            onClose={onClose}
            startTime={recording.event?.start_time}
            endTime={recording.event?.end_time}
            onShareUpdate={handleShareUpdate}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <VideoPlayer
                recordingId={recordingId}
                videoUrl={recording.video_url}
                recordingUrl={recording.recording_url}
                title={recording.event?.title || ''}
                participants={participants}
                grantId={profile?.nylas_grant_id}
                notetakerId={recording.notetaker_id}
              />
            </div>
            
            {recording.transcript_content && (
              <TranscriptSection content={recording.transcript_content} />
            )}
          </div>

          <VideoDescription description={recording.event?.description} />
        </CardContent>
      </Card>
    </div>
  );
}