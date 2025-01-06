import { Share2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareVideoDialog } from "../ShareVideoDialog";
import { ShareViaEmailButton } from "../email/ShareViaEmailButton";
import type { EventParticipant } from "@/types/calendar";

interface VideoPlayerHeaderProps {
  recordingId: string;
  title: string;
  shareUrl: string | null;
  participants: EventParticipant[];
}

export function VideoPlayerHeader({ 
  recordingId, 
  title,
  shareUrl,
  participants,
}: VideoPlayerHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        <ShareVideoDialog recordingId={recordingId} />
        {shareUrl && (
          <ShareViaEmailButton
            shareUrl={shareUrl}
            eventTitle={title}
            participants={participants}
            recordingId={recordingId}
          />
        )}
      </div>
    </div>
  );
}