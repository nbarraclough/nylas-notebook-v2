import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SharedEventHeader } from "./SharedEventHeader";
import { SharedVideoPlayer } from "./SharedVideoPlayer";
import { EventDescription } from "@/components/calendar/EventDescription";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { useSharedVideo } from "./video/useSharedVideo";
import { LoadingState } from "./video/LoadingState";
import { ErrorState } from "./video/ErrorState";

export function SharedVideoView() {
  const { recording, isLoading, eventData } = useSharedVideo();

  console.log('SharedVideoView data:', { recording, eventData });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!eventData) {
    return <ErrorState />;
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
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-video relative">
                <SharedVideoPlayer
                  videoUrl={recording?.video_url}
                  recordingUrl={null}
                  recordingId={recording?.id || ''}
                  notetakerId={recording?.notetaker_id}
                  muxPlaybackId={recording?.mux_playback_id}
                />
              </div>
              
              {recording?.transcript_content && (
                <TranscriptSection content={recording.transcript_content} />
              )}
            </div>

            {eventData.description && (
              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-medium">Description</h3>
                <EventDescription description={eventData.description} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}