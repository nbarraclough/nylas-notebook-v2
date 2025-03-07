
import { Button } from "@/components/ui/button";
import { Loader, Download, RefreshCw } from "lucide-react";

interface NotetakerActionsProps {
  recordingId: string;
  notetakerId: string;
  status: string;
  isKicking: boolean;
  isRetrieving: boolean;
  onKick: (notetakerId: string, recordingId: string) => Promise<void>;
  onRetrieve: (recordingId: string, notetakerId: string, forceRefresh?: boolean) => Promise<void>;
}

export function NotetakerActions({
  recordingId,
  notetakerId,
  status,
  isKicking,
  isRetrieving,
  onKick,
  onRetrieve
}: NotetakerActionsProps) {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onKick(notetakerId, recordingId)}
        disabled={isKicking}
      >
        {isKicking ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Kicking...
          </>
        ) : (
          'Manual Kick'
        )}
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onRetrieve(recordingId, notetakerId)}
        disabled={isRetrieving}
      >
        {isRetrieving ? (
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
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onRetrieve(recordingId, notetakerId, true)}
        disabled={isRetrieving}
      >
        {isRetrieving ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Refresh
          </>
        )}
      </Button>
    </div>
  );
}
