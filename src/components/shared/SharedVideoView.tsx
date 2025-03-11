
import React, { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SharedEventHeader } from "./SharedEventHeader";
import { SharedVideoPlayer } from "./SharedVideoPlayer";
import { EventDescription } from "@/components/calendar/EventDescription";
import { TranscriptSection } from "@/components/recordings/transcript/TranscriptSection";
import { useSharedVideo } from "./video/useSharedVideo";
import { LoadingState } from "./video/LoadingState";
import { ErrorState } from "./video/ErrorState";
import type { BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";
import { cn } from "@/lib/utils";

export function SharedVideoView() {
  const { recording, isLoading, eventData } = useSharedVideo();
  const videoRef = useRef<BaseVideoPlayerRef>(null);

  console.log('SharedVideoView data:', { recording, eventData });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!eventData) {
    return <ErrorState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <SharedEventHeader
          title={eventData.title}
          startTime={eventData.start_time}
          endTime={eventData.end_time}
          participants={eventData.participants}
        />

        <Card className="border-gray-100 shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="aspect-video relative rounded-lg overflow-hidden shadow-sm">
                <SharedVideoPlayer
                  ref={videoRef}
                  videoUrl={null}
                  recordingUrl={null}
                  recordingId={recording?.id || ''}
                  notetakerId={recording?.notetaker_id}
                  muxPlaybackId={recording?.mux_playback_id}
                />
              </div>
              
              {recording?.transcript_content && (
                <div className={cn(
                  "rounded-lg overflow-hidden",
                  "bg-white/80 dark:bg-gray-900/50", 
                  "border border-gray-100 dark:border-gray-800"
                )}>
                  <TranscriptSection content={recording.transcript_content} videoRef={videoRef} />
                </div>
              )}
            </div>

            {eventData.description && (
              <div className="prose prose-sm max-w-none border-t border-gray-100 pt-6">
                <h3 className="text-lg font-medium mb-3">Description</h3>
                <EventDescription description={eventData.description} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
