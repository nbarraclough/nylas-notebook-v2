import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import Hls from "hls.js";
import { useEffect, useRef } from "react";

interface VideoPlayerDialogProps {
  videoUrl: string;
  title: string;
  children?: React.ReactNode;
  onRetrieveMedia?: () => Promise<void>;
}

export const VideoPlayerDialog = ({ videoUrl, title, children, onRetrieveMedia }: VideoPlayerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !isOpen) return;

    const video = videoRef.current;
    
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(error => {
          console.log("Playback failed:", error);
        });
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari
      video.src = videoUrl;
    }
  }, [videoUrl, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <video 
            ref={videoRef}
            className="w-full h-full rounded-lg"
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};