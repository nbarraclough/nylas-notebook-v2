import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { BaseVideoPlayer, type BaseVideoPlayerRef } from "./player/BaseVideoPlayer";
import { useRef } from "react";

interface VideoPlayerDialogProps {
  videoUrl: string;
  title: string;
  muxPlaybackId?: string;
  children?: React.ReactNode;
}

export const VideoPlayerDialog = ({ videoUrl, title, muxPlaybackId, children }: VideoPlayerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<BaseVideoPlayerRef>(null);

  const getThumbnailUrl = () => {
    if (muxPlaybackId) {
      return `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=35`;
    }
    return null;
  };

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
          {isOpen ? (
            <BaseVideoPlayer 
              ref={videoRef}
              videoUrl={videoUrl}
              recordingUrl={null}
            />
          ) : muxPlaybackId ? (
            <img 
              src={getThumbnailUrl()} 
              alt={`Thumbnail for ${title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No preview available</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};