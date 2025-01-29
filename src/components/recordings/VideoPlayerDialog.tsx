import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface VideoPlayerDialogProps {
  recordingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VideoPlayerDialog = ({ recordingId, open, onOpenChange }: VideoPlayerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-6xl p-0"
        onOpenAutoFocus={(e) => {
          // Prevent default focus behavior
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent focus return on close
          e.preventDefault();
        }}
      >
        <VisuallyHidden>
          <h2 id="video-dialog-title">Video Player</h2>
          <p id="video-dialog-description">Video playback dialog</p>
        </VisuallyHidden>
        {open && (
          <VideoPlayerView 
            recordingId={recordingId} 
            onClose={() => onOpenChange(false)} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
};