import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface VideoPlayerDialogProps {
  videoUrl: string;
  title: string;
}

export const VideoPlayerDialog = ({ videoUrl, title }: VideoPlayerDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          Play Recording
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          <video 
            src={videoUrl} 
            controls 
            className="w-full h-full rounded-lg"
            playsInline
            preload="metadata"
            controlsList="nodownload"
            type="video/webm"
          >
            <source src={videoUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};