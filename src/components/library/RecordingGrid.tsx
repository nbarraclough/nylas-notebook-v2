import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { VideoPlayerView } from "./VideoPlayerView";
import { Badge } from "@/components/ui/badge";
import { Shield, Globe } from "lucide-react";

interface RecordingGridProps {
  recordings: any[];
  isLoading: boolean;
  selectedRecording: string | null;
  onRecordingSelect: (id: string | null) => void;
}

export function RecordingGrid({ 
  recordings, 
  isLoading, 
  selectedRecording,
  onRecordingSelect 
}: RecordingGridProps) {
  const isInternalMeeting = (recording: any) => {
    const organizerDomain = recording.event?.organizer?.email?.split('@')[1];
    if (!organizerDomain || !Array.isArray(recording.event?.participants)) return false;
    
    return recording.event.participants.every((participant: any) => {
      const participantDomain = participant.email?.split('@')[1];
      return participantDomain === organizerDomain;
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'secondary';
      case 'retrieving':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
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

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No recordings found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recordings.map((recording) => {
          const internal = isInternalMeeting(recording);
          return (
            <Card
              key={recording.id}
              className="cursor-pointer card-hover-effect"
              onClick={() => onRecordingSelect(recording.id)}
            >
              <div className="aspect-video bg-muted relative">
                {(recording.video_url || recording.recording_url) && (
                  <video
                    src={recording.video_url || recording.recording_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                )}
                {recording.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-sm px-2 py-1 rounded">
                    {Math.floor(recording.duration / 60)} min
                  </div>
                )}
              </div>
              <CardContent className="p-4">
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
                  <div className="flex flex-col gap-1">
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
                    {recording.status && recording.status !== 'ready' && (
                      <Badge 
                        variant={getStatusBadgeVariant(recording.status.toLowerCase())}
                        className="text-xs"
                      >
                        {recording.status}
                      </Badge>
                    )}
                  </div>
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