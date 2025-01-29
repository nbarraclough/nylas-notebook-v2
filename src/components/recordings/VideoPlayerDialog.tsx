import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

interface VideoPlayerDialogProps {
  videoUrl: string;
  title: string;
  muxPlaybackId?: string;
  children?: React.ReactNode;
}

export const VideoPlayerDialog = ({ videoUrl, title, muxPlaybackId, children }: VideoPlayerDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getThumbnailUrl = () => {
    if (muxPlaybackId) {
      return `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=35`;
    }
    return null;
  };

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
          {muxPlaybackId ? (
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