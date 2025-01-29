import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./player/BaseVideoPlayer";
import { useRef } from "react";

interface VideoPlayerDialogProps {
  videoUrl: string;
  title: string;
  children?: React.ReactNode;
}

export const VideoPlayerDialog = ({ videoUrl, title, children }: VideoPlayerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<BaseVideoPlayerRef>(null);

  // Enhanced cleanup when dialog closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.cleanup();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && videoRef.current) {
        videoRef.current.cleanup();
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg line-clamp-2">{title}</DialogTitle>
          <DialogDescription>
            Recording playback for {title}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full relative">
          {isOpen && (
            <BaseVideoPlayer 
              ref={videoRef}
              videoUrl={videoUrl}
              recordingUrl={null}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};