import { Button } from "@/components/ui/button";
import { Download, Loader } from "lucide-react";
import { ShareVideoDialog } from "./ShareVideoDialog";
import { VideoPlayerDialog } from "./VideoPlayerDialog";

interface RecordingActionsProps {
  recordingId: string;
  notetakerId: string | null;
  videoUrl: string | null;
  status: string;
  title: string;
  isRetrievingMedia: boolean;
  onRetrieveMedia: () => void;
}

export const RecordingActions = ({
  recordingId,
  notetakerId,
  videoUrl,
  status,
  title,
  isRetrievingMedia,
  onRetrieveMedia
}: RecordingActionsProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {videoUrl && (
          <VideoPlayerDialog videoUrl={videoUrl} title={title} />
        )}
        {notetakerId && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetrieveMedia}
            disabled={isRetrievingMedia || !notetakerId}
          >
            {isRetrievingMedia ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Retrieving...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Retrieve Media
              </>
            )}
          </Button>
        )}
      </div>
      {videoUrl && (
        <ShareVideoDialog recordingId={recordingId} />
      )}
    </div>
  );
};