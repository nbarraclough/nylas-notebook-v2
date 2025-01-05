import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types/json";
import { SharedEventHeader } from "./SharedEventHeader";
import { SharedVideoPlayer } from "./SharedVideoPlayer";
import { SharedContentTabs } from "./SharedContentTabs";

interface SharedRecording {
  video_url: string | null;
  recording_url: string | null;
  id: string;
  event: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    participants: EventParticipant[];
  };
}

// Helper function to transform Json to EventParticipant[]
const transformParticipants = (participants: Json): EventParticipant[] => {
  if (!Array.isArray(participants)) return [];
  return participants.map(p => ({
    name: (p as any)?.name || 'Unknown',
    email: (p as any)?.email || ''
  }));
};

export function SharedVideoView() {
  const { token } = useParams();
  const { toast } = useToast();
  const [recording, setRecording] = useState<SharedRecording | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSharedVideo = async () => {
      try {
        if (!token) throw new Error('No share token provided');

        const { data: share, error: shareError } = await supabase
          .from('video_shares')
          .select(`
            recording:recordings!inner (
              id,
              video_url,
              recording_url,
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
          .maybeSingle();

        if (shareError) throw shareError;
        if (!share?.recording) {
          toast({
            title: "Video Not Found",
            description: "This shared video link may have expired or been removed.",
            variant: "destructive",
          });
          setRecording(null);
          setIsLoading(false);
          return;
        }

        // Transform the data to match SharedRecording type
        const transformedRecording: SharedRecording = {
          id: share.recording.id,
          video_url: share.recording.video_url,
          recording_url: share.recording.recording_url,
          event: {
            ...share.recording.event,
            participants: transformParticipants(share.recording.event.participants)
          }
        };

        // Record the view
        await supabase
          .from('video_views')
          .insert({
            recording_id: share.recording.id,
            external_viewer_ip: 'anonymous'
          });

        setRecording(transformedRecording);
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

    fetchSharedVideo();
  }, [token, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!recording) {
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
          title={recording.event.title}
          startTime={recording.event.start_time}
          endTime={recording.event.end_time}
          participants={recording.event.participants}
        />

        <Card>
          <CardContent className="p-6">
            <div className="aspect-video mb-6">
              <SharedVideoPlayer
                videoUrl={recording.video_url}
                recordingUrl={recording.recording_url}
              />
            </div>

            <SharedContentTabs description={recording.event.description} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}