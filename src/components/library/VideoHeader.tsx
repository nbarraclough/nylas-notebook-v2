import { Badge } from "@/components/ui/badge";
import { Share2, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareVideoDialog } from "@/components/recordings/ShareVideoDialog";
import { ShareViaEmailButton } from "@/components/recordings/email/ShareViaEmailButton";
import type { EventParticipant } from "@/types/calendar";

interface VideoHeaderProps {
  title: string;
  isInternal: boolean;
  shareUrl: string | null;
  participants: EventParticipant[];
  grantId?: string;
  recordingId: string;
  onClose: () => void;
}

export function VideoHeader({
  title,
  isInternal,
  shareUrl,
  participants,
  grantId,
  recordingId,
  onClose
}: VideoHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Badge 
          variant={isInternal ? "secondary" : "outline"}
          className={`text-xs ${isInternal ? 'bg-purple-100 hover:bg-purple-100 text-purple-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
        >
          {isInternal ? (
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
      <div className="flex items-center gap-2">
        <ShareVideoDialog recordingId={recordingId} />
        {shareUrl && (
          <ShareViaEmailButton
            shareUrl={shareUrl}
            eventTitle={title}
            participants={participants}
            grantId={grantId}
            recordingId={recordingId}
          />
        )}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}