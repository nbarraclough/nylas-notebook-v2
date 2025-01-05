import { useState } from "react";
import { Card } from "@/components/ui/card";
import { VideoPlayerHeader } from "./VideoPlayerHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerProps {
  recordingId: string;
  videoUrl: string | null;
  recordingUrl: string | null;
  title: string;
  participants: EventParticipant[];
  grantId: string | null;
}

export function VideoPlayer({ 
  recordingId, 
  videoUrl,
  recordingUrl,
  title,
  participants,
  grantId
}: VideoPlayerProps) {
  // Fetch public share URL if it exists
  const { data: publicShare } = useQuery({
    queryKey: ['publicShare', recordingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_shares')
        .select('external_token')
        .eq('recording_id', recordingId)
        .eq('share_type', 'external')
        .maybeSingle();

      if (error) {
        console.error('Error fetching public share:', error);
        return null;
      }

      return data ? `${window.location.origin}/shared/${data.external_token}` : null;
    },
  });

  // Use video_url if available, fall back to recording_url
  const finalVideoUrl = videoUrl || recordingUrl;

  if (!finalVideoUrl) {
    return (
      <Card className="w-full">
        <VideoPlayerHeader
          recordingId={recordingId}
          title={title}
          shareUrl={publicShare}
          participants={participants}
          grantId={grantId}
        />
        <div className="aspect-video bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">This video is no longer available or has been removed.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <VideoPlayerHeader
        recordingId={recordingId}
        title={title}
        shareUrl={publicShare}
        participants={participants}
        grantId={grantId}
      />
      <div className="aspect-video">
        <video
          src={finalVideoUrl}
          controls
          className="w-full h-full"
          playsInline
          preload="metadata"
          controlsList="nodownload"
        >
          <source src={finalVideoUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </div>
    </Card>
  );
}