import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { EmailComposerDialog } from "./EmailComposerDialog";
import { useToast } from "@/hooks/use-toast";
import type { EventParticipant } from "@/types/calendar";

interface ShareViaEmailButtonProps {
  shareUrl: string;
  eventTitle: string;
  participants: EventParticipant[];
  grantId: string | null;
}

export function ShareViaEmailButton({ 
  shareUrl, 
  eventTitle, 
  participants,
  grantId
}: ShareViaEmailButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleClick = () => {
    if (!shareUrl) {
      toast({
        title: "Generate share link first",
        description: "Please generate a public share link before sending via email.",
        variant: "destructive",
      });
      return;
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="flex items-center gap-2"
      >
        <Mail className="h-4 w-4" />
        Email to Participants
      </Button>

      <EmailComposerDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        eventTitle={eventTitle}
        recipients={participants}
        shareUrl={shareUrl}
        grantId={grantId}
      />
    </>
  );
}