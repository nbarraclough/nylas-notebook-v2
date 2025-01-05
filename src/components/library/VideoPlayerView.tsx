import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Mail } from "lucide-react";
import { ShareVideoDialog } from "@/components/recordings/ShareVideoDialog";
import { ShareViaEmailButton } from "@/components/recordings/email/ShareViaEmailButton";
import { VideoPlayer } from "@/components/recordings/player/VideoPlayer";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerViewProps {
  recordingId: string;
  onClose: () => void;
}

export function VideoPlayerView({ recordingId, onClose }: VideoPlayerViewProps) {
  const { data: recording, isLoading } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            participants,
            organizer
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
        .select('nylas_grant_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
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

  const publicShare = recording.video_shares?.find(share => share.share_type === 'external');
  const shareUrl = publicShare ? `${window.location.origin}/shared/${publicShare.external_token}` : null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-6xl mx-4">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{recording.event?.title}</h2>
            <div className="flex items-center gap-2">
              <ShareVideoDialog recordingId={recordingId} />
              {shareUrl && (
                <ShareViaEmailButton
                  shareUrl={shareUrl}
                  eventTitle={recording.event?.title || ''}
                  participants={(recording.event?.participants || []) as EventParticipant[]}
                  grantId={profile?.nylas_grant_id}
                  recordingId={recordingId}
                />
              )}
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <VideoPlayer
              videoUrl={recording.video_url}
              recordingUrl={recording.recording_url}
            />
          </div>

          {recording.event?.description && (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-medium">Description</h3>
              <p className="whitespace-pre-line">{recording.event.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}