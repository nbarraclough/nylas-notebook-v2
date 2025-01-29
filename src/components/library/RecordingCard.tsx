import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayerDialog } from "@/components/recordings/VideoPlayerDialog";
import { RecordingStatus } from "@/components/recordings/RecordingStatus";
import { RecordingActions } from "@/components/recordings/RecordingActions";
import { useProfile } from "@/hooks/use-profile";
import { formatDistanceToNow } from "date-fns";

interface RecordingCardProps {
  recording: {
    id: string;
    status: string;
    created_at: string;
    mux_playback_id?: string | null;
    event: {
      title: string;
      participants?: { name?: string; email: string }[];
    };
    notetaker_id?: string | null;
  };
}

export function RecordingCard({ recording }: RecordingCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: profile } = useProfile();
  
  // Get participants excluding the notetaker
  const participants = recording.event.participants?.filter(
    p => !p.email.includes("notetaker")
  ) || [];

  // Generate Mux thumbnail URL
  const thumbnailUrl = recording.mux_playback_id 
    ? `https://image.mux.com/${recording.mux_playback_id}/thumbnail.jpg?time=0` 
    : null;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            role="button" 
            tabIndex={0}
            onClick={() => setIsOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
            className="cursor-pointer"
          >
            {/* Thumbnail Container */}
            <div className="aspect-video bg-muted relative">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={recording.event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No preview available</span>
                </div>
              )}
              <RecordingStatus status={recording.status} className="absolute top-2 right-2" />
            </div>

            {/* Recording Info */}
            <div className="p-4">
              <h3 className="font-semibold mb-2 line-clamp-1">
                {recording.event.title}
              </h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="line-clamp-1">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </p>
                <p>
                  {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0">
            <RecordingActions recording={recording} />
          </div>
        </CardContent>
      </Card>

      <VideoPlayerDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        recordingId={recording.id}
      />
    </>
  );
}