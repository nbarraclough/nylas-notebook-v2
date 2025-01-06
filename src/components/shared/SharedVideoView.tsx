import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useVideoViews } from "@/hooks/use-video-views";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types";
import { SharedEventHeader } from "./SharedEventHeader";
import { SharedVideoPlayer } from "./SharedVideoPlayer";
import { SharedContentTabs } from "./SharedContentTabs";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { Loader2 } from "lucide-react";

interface SharedRecording {
  id: string;
  video_url: string | null;
  recording_url: string | null;
  notetaker_id: string | null;
  transcript_content: Json | null;
  event: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    participants: EventParticipant[];
  };
}

export function SharedVideoView() {
  const { token } = useParams();
  const { toast } = useToast();
  const { trackView } = useVideoViews();
  const [recording, setRecording] = useState<SharedRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventData, setEventData] = useState<SharedRecording['event'] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMedia = async (recordingId: string, notetakerId: string | null) => {
    try {
      setIsRefreshing(true);
      console.log('Refreshing media for recording:', recordingId, 'notetakerId:', notetakerId);
      
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId: notetakerId || undefined
        },
      });

      if (error) {
        console.error('Error refreshing media:', error);
        toast({
          title: "Error",
          description: "Failed to refresh video. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Refetch the recording to get updated URLs
      await fetchSharedVideo();
      
      toast({
        title: "Success",
        description: "Video refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing media:', error);
      toast({
        title: "Error",
        description: "Failed to refresh video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSharedVideo = async () => {
    try {
      if (!token) throw new Error('No share token provided');

      console.log('Fetching shared video with token:', token);

      const { data: share, error } = await supabase
        .from('video_shares')
        .select(`
          recording:recordings!inner (
            id,
            video_url,
            recording_url,
            notetaker_id,
            transcript_content,
            event:events!inner (
              title,
              description,
              start_time,
              end_time,
              participants
            )
          )
        `)
        .eq('external_token', token)
        .eq('share_type', 'external')
        .maybeSingle();

      if (error) {
        console.error('Error fetching shared video:', error);
        throw error;
      }

      if (!share?.recording) {
        console.log('No recording found for token:', token);
        setEventData(null);
        setRecording(null);
        return;
      }

      // Set event data regardless of recording availability
      if (share.recording.event) {
        const eventInfo = {
          ...share.recording.event,
          participants: transformParticipants(share.recording.event.participants)
        };
        setEventData(eventInfo);
      }

      // Transform the data to match SharedRecording type
      const transformedRecording: SharedRecording = {
        id: share.recording.id,
        video_url: share.recording.video_url,
        recording_url: share.recording.recording_url,
        notetaker_id: share.recording.notetaker_id,
        transcript_content: share.recording.transcript_content,
        event: {
          ...share.recording.event,
          participants: transformParticipants(share.recording.event.participants)
        }
      };

      setRecording(transformedRecording);

      // Track view
      await trackView(share.recording.id);
    } catch (error) {
      console.error('Error fetching shared video:', error);
      toast({
        title: "Error",
        description: "Failed to load the shared video.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedVideo();
  }, [token, toast, trackView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              This video is no longer available or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <SharedEventHeader
          title={eventData.title}
          startTime={eventData.start_time}
          endTime={eventData.end_time}
          participants={eventData.participants}
        />

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-video relative">
                {isRefreshing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Refreshing video...</p>
                    </div>
                  </div>
                )}
                <SharedVideoPlayer
                  videoUrl={recording?.video_url}
                  recordingUrl={recording?.recording_url}
                  recordingId={recording?.id || ''}
                  notetakerId={recording?.notetaker_id}
                  onRefreshMedia={refreshMedia}
                  isRefreshing={isRefreshing}
                />
              </div>
              
              {recording?.transcript_content && (
                <TranscriptSection content={recording.transcript_content} />
              )}
            </div>

            <SharedContentTabs description={eventData.description} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to transform Json to EventParticipant[]
const transformParticipants = (participants: Json): EventParticipant[] => {
  if (!Array.isArray(participants)) return [];
  return participants.map(p => ({
    name: (p as any)?.name || 'Unknown',
    email: (p as any)?.email || ''
  }));
};