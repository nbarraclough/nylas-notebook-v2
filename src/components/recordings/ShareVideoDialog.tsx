import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { ShareDialogForm } from "./share/ShareDialogForm";

interface ShareVideoDialogProps {
  recordingId: string;
  onShareUpdate?: () => void;
}

export function ShareVideoDialog({ recordingId, onShareUpdate }: ShareVideoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    onShareUpdate?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent 
        onPointerDownOutside={(e) => e.preventDefault()} 
        className="sm:max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle>Share Recording</DialogTitle>
        </DialogHeader>
        <ShareDialogForm 
          recordingId={recordingId} 
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}