import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

interface VideoPlayerDialogProps {
  recordingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VideoPlayerDialog = ({ recordingId, open, onOpenChange }: VideoPlayerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg line-clamp-2">Recording Playback</DialogTitle>
          <DialogDescription>
            Recording playback for {recordingId}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full relative">
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">Loading video player...</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};