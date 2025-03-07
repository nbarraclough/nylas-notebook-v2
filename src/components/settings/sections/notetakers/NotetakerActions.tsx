
import { Button } from "@/components/ui/button";
import { Loader, Download, RefreshCw } from "lucide-react";

interface NotetakerActionsProps {
  recordingId: string;
  notetakerId: string;
  status: string;
  isKicking: boolean;
  isRetrieving: boolean;
  onKick: () => Promise<void>;
  onRetrieve: (forceRefresh?: boolean) => Promise<void>;
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
        onClick={onKick}
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
        onClick={() => onRetrieve(false)}
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
        onClick={() => onRetrieve(true)}
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
