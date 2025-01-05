import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import type { NotetakerActionsProps } from "./types";

export function NotetakerActions({ 
  notetakerId, 
  recordingId, 
  isKicking, 
  isRetrieving, 
  onKick, 
  onRetrieve 
}: NotetakerActionsProps) {
  return (
    <div className="flex items-center gap-2">
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
        onClick={onRetrieve}
        disabled={isRetrieving}
      >
        {isRetrieving ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Retrieving...
          </>
        ) : (
          'Retrieve Media'
        )}
      </Button>
    </div>
  );
}