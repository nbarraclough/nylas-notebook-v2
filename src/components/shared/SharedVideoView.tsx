import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function SharedVideoView() {
  const { token } = useParams();
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSharedVideo = async () => {
      try {
        const { data: share, error: shareError } = await supabase
          .from('video_shares')
          .select(`
            recording:recordings (
              video_url,
              event:events (
                title,
                description,
                start_time
              )
            )
          `)
          .eq('external_token', token)
          .maybeSingle();

        if (shareError) throw shareError;
        if (!share) throw new Error('Share not found');

        // Record the view
        await supabase
          .from('video_views')
          .insert({
            recording_id: share.recording.id,
            external_viewer_ip: 'anonymous'
          });

        setVideoUrl(share.recording.video_url);
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

  if (!videoUrl) {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <div className="aspect-video">
            <video
              src={videoUrl}
              controls
              className="w-full h-full rounded-lg"
              autoPlay
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}