
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./player/BaseVideoPlayer";
import { useRef } from "react";
import { cn } from "@/lib/utils";

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
      <DialogContent className={cn(
        "w-[95vw] max-w-5xl mx-auto",
        "bg-gradient-to-br from-white to-gray-50/90",
        "backdrop-blur-sm border border-gray-100 shadow-md",
        "dark:from-gray-900 dark:to-gray-900/80 dark:border-gray-800"
      )}>
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg line-clamp-2">{title}</DialogTitle>
          <DialogDescription>
            Recording playback for {title}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full relative rounded-lg overflow-hidden shadow-sm">
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
