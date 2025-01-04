import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventParticipant } from "@/types/calendar";
import type { Json } from "@/integrations/supabase/types/json";

interface SharedRecording {
  video_url: string;
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
            recording_id,
            recording:recordings!inner (
              id,
              video_url,
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
          video_url: share.recording.video_url || '', // Ensure video_url is never undefined
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
          description: "Failed to load the shared video. It may have expired or been removed.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSharedVideo();
    }
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
              This video is no longer available or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Event Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">{recording.event.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(recording.event.start_time), "EEEE, MMMM d, yyyy 'at' h:mm a")} - {format(new Date(recording.event.end_time), "h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {recording.event.participants?.length || 0} participants
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video and Content Tabs */}
        <Card>
          <CardContent className="p-6">
            <div className="aspect-video mb-6">
              {recording.video_url ? (
                <video
                  src={recording.video_url}
                  controls
                  className="w-full h-full rounded-lg"
                  autoPlay
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground">Video not available</p>
                </div>
              )}
            </div>

            <Tabs defaultValue="summary" className="w-full">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="action-items">Action Items</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4">
                <div className="prose prose-sm max-w-none">
                  {recording.event.description || 'No summary available.'}
                </div>
              </TabsContent>
              <TabsContent value="transcript" className="mt-4">
                <div className="text-muted-foreground">
                  Transcript will be available soon.
                </div>
              </TabsContent>
              <TabsContent value="action-items" className="mt-4">
                <div className="text-muted-foreground">
                  No action items have been identified yet.
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}