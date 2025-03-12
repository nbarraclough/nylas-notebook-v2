
import { useState } from "react";
import { useToast } from "./use-toast";

export function useVideoDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const downloadVideo = async (playbackId: string, title: string) => {
    try {
      setIsDownloading(true);
      toast({
        title: "Download started",
        description: "Preparing your video download...",
      });
      
      // Get the MP4 download URL from Mux
      const mp4Url = `https://stream.mux.com/${playbackId}/low.mp4`;
      
      // Fetch the video as a blob
      const response = await fetch(mp4Url);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Convert the response to a blob
      const blob = await response.blob();
      
      // Create a local URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create an anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download complete",
        description: "Your video has been downloaded",
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
