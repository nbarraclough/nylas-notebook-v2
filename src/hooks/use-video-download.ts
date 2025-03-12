
import { useState } from "react";
import { useToast } from "./use-toast";

export function useVideoDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const downloadVideo = async (playbackId: string, title: string) => {
    try {
      setIsDownloading(true);
      
      // Get the MP4 download URL from Mux
      const mp4Url = `https://stream.mux.com/${playbackId}/low.mp4`;
      
      // Create an anchor element and trigger download
      const link = document.createElement('a');
      link.href = mp4Url;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Your video download will begin shortly",
      });
    } catch (error) {
      console.error('Error downloading video:', error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading your video",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    isDownloading,
    downloadVideo
  };
}
