import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { VideoPlayerView } from "./VideoPlayerView";
import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Clock } from "lucide-react";
import { RecordingStatus } from "@/components/recordings/RecordingStatus";

interface RecordingGridProps {
  recordings: any[];
  isLoading: boolean;
  selectedRecording: string | null;
  onRecordingSelect: (id: string | null) => void;
  showErrors?: boolean;
}

export function RecordingGrid({ 
  recordings, 
  isLoading, 
  selectedRecording,
  onRecordingSelect,
  showErrors = false
}: RecordingGridProps) {
  const isInternalMeeting = (recording: any) => {
    const organizerDomain = recording.event?.organizer?.email?.split('@')[1];
    if (!organizerDomain || !Array.isArray(recording.event?.participants)) return false;
    
    return recording.event.participants.every((participant: any) => {
      const participantDomain = participant.email?.split('@')[1];
      return participantDomain === organizerDomain;
    });
  };

  const getThumbnailUrl = (recording: any) => {
    if (recording.mux_playback_id) {
      return `https://image.mux.com/${recording.mux_playback_id}/thumbnail.jpg?time=35`;
    }
    return null;
  };

  const isScheduled = (recording: any) => {
    const scheduledStatuses = ["waiting", "joining", "waiting_for_admission", "dispatched"];
    const hasScheduledStatus = scheduledStatuses.includes(recording.status);
    
    const isFutureEvent = recording.event?.start_time && new Date(recording.event.start_time) > new Date();
    
    return hasScheduledStatus || isFutureEvent;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="cursor-pointer">
            <div className="aspect-video bg-muted animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const filteredRecordings = recordings.filter(recording => recording.status !== 'cancelled');

  if (filteredRecordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No recordings found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRecordings.map((recording) => {
          const internal = isInternalMeeting(recording);
          const isError = ['error', 'failed_entry', 'failed'].includes(recording.status);
          const isProcessing = ["waiting", "retrieving", "processing"].includes(recording.status);
          const isWaitingToStart = isScheduled(recording);
          const thumbnailUrl = getThumbnailUrl(recording);
          
          const hasVideo = !!recording.video_url || !!recording.recording_url || !!recording.mux_playback_id;
          const hasTranscript = !!recording.transcript_content;
          
          return (
            <Card
              key={recording.id}
              className={`${
                isError 
                  ? 'bg-red-50 cursor-not-allowed' 
                  : isProcessing 
                    ? 'bg-blue-50 cursor-pointer card-hover-effect'
                    : isWaitingToStart
                      ? 'bg-yellow-50 cursor-pointer card-hover-effect'
                      : 'cursor-pointer card-hover-effect'
              }`}
              onClick={() => !isError && onRecordingSelect(recording.id)}
            >
              <div className="aspect-video bg-muted relative">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={recording.event?.title || 'Recording thumbnail'}
                    className="w-full h-full object-cover"
                  />
                ) : (recording.video_url || recording.recording_url) && (
                  <video
                    src={recording.video_url || recording.recording_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                )}
                {isWaitingToStart && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/40">
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-full flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Scheduled</span>
                    </div>
                  </div>
                )}
                {recording.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-sm px-2 py-1 rounded">
                    {Math.floor(recording.duration / 60)} min
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="mb-2">
                  <RecordingStatus 
                    status={recording.status} 
                    hasVideo={hasVideo}
                    hasTranscript={hasTranscript}
                    variant="inline"
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium line-clamp-1">
                      {recording.event?.title || 'Untitled Recording'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {recording.event?.start_time && 
                        format(new Date(recording.event.start_time), "PPp")}
                    </p>
                  </div>
                  <Badge 
                    variant={internal ? "secondary" : "outline"}
                    className={`text-xs ${internal ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
                  >
                    {internal ? (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Internal
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        External
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedRecording && (
        <VideoPlayerView
          recordingId={selectedRecording}
          onClose={() => onRecordingSelect(null)}
        />
      )}
    </>
  );
}
