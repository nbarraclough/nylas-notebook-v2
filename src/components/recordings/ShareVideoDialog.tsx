import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { ShareDialogForm } from "./share/ShareDialogForm";

interface ShareVideoDialogProps {
  recordingId: string;
}

export function ShareVideoDialog({ recordingId }: ShareVideoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Share Recording</DialogTitle>
        </DialogHeader>
        <ShareDialogForm 
          recordingId={recordingId} 
          onSuccess={() => setIsOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}