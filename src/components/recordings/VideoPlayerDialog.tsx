import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VideoPlayerDialogProps {
  videoUrl: string;
  title: string;
  children?: React.ReactNode;
  onRetrieveMedia?: () => Promise<void>;
}

export const VideoPlayerDialog = ({ videoUrl, title, children, onRetrieveMedia }: VideoPlayerDialogProps) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleError = async (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (onRetrieveMedia) {
      setIsRefreshing(true);
      try {
        await onRetrieveMedia();
        toast({
          title: "Video URL refreshed",
          description: "Please try playing the video again.",
        });
      } catch (error) {
        toast({
          title: "Error refreshing video",
          description: "Could not refresh the video URL. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
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
            onError={handleError}
          >
            <source src={videoUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>
          {isRefreshing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-white">Refreshing video URL...</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};