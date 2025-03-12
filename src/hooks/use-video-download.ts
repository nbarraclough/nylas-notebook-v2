import { useState } from "react";
import { useToast } from "./use-toast";

export function useVideoDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();

  const downloadVideo = async (playbackId: string, title: string) => {
    let toastId: string | undefined;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      // Show initial toast notification
      const initialToast = toast({
        title: "Download started",
        description: "Preparing your high-quality video download...",
      });
      toastId = initialToast.id;
      
      // Get the high quality MP4 download URL from Mux instead of low quality
      const mp4Url = `https://stream.mux.com/${playbackId}/high.mp4`;
      
      // Fetch the video as a blob with progress tracking
      const response = await fetch(mp4Url);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // Get content length for progress calculation
      const contentLength = Number(response.headers.get('content-length') || '0');
      const reader = response.body?.getReader();
      
      if (!reader || contentLength === 0) {
        throw new Error('Unable to read video stream');
      }
      
      // Read the response in chunks and track progress
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Calculate and update progress
        const progress = Math.round((receivedLength / contentLength) * 100);
        setDownloadProgress(progress);
        
        // Update toast with progress
        if (toastId) {
          toast({
            title: "Downloading video",
            description: `${progress}% complete`,
          });
        }
      }
      
      // Combine all chunks into a single Uint8Array
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      
      // Convert to blob
      const blob = new Blob([chunksAll], { type: 'video/mp4' });
      
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
        description: "Your high-quality video has been downloaded",
      });
    } catch (error) {
      console.error('Error downloading video:', error);
      
      // Try fallback to medium quality if high quality fails
      if (error instanceof Error && error.message.includes('Failed to download')) {
        try {
          console.log('Falling back to medium quality...');
          // Update toast
          if (toastId) {
            toast({
              title: "High quality unavailable",
              description: "Trying medium quality instead...",
            });
          }
          
          const mediumUrl = `https://stream.mux.com/${playbackId}/medium.mp4`;
          const response = await fetch(mediumUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to download medium quality: ${response.status}`);
          }
          
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
          document.body.appendChild(link);
          link.click();
          
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          
          toast({
            title: "Download complete",
            description: "Your video has been downloaded in medium quality",
          });
          return;
        } catch (fallbackError) {
          console.error('Fallback download failed:', fallbackError);
        }
      }
      
      toast({
        title: "Download failed",
        description: "There was a problem downloading your video. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return {
    isDownloading,
    downloadProgress,
    downloadVideo
  };
}
