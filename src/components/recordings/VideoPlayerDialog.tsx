import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";

interface VideoPlayerDialogProps {
  recordingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VideoPlayerDialog = ({ recordingId, open, onOpenChange }: VideoPlayerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl p-0">
        <VideoPlayerView 
          recordingId={recordingId} 
          onClose={() => onOpenChange(false)} 
        />
      </DialogContent>
    </Dialog>
  );
};