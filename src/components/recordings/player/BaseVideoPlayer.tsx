
import { forwardRef, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoDownload } from "@/hooks/use-video-download";
import { cn } from "@/lib/utils";

export interface BaseVideoPlayerRef {
  pause: () => void;
  play: () => void;
  seek: (time: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  cleanup: () => void;
}

interface BaseVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  onRefreshMedia?: () => Promise<void>;
  isRefreshing?: boolean;
  muxPlaybackId?: string | null;
  title?: string;
}

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({
  videoUrl,
  recordingUrl,
  onRefreshMedia,
  isRefreshing,
  muxPlaybackId,
  title = 'Recording'
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { isDownloading, downloadVideo } = useVideoDownload();
  const [showControls, setShowControls] = useState(false);

  // Enhanced cleanup function with more thorough HLS and video cleanup
  const cleanupHls = () => {
    console.log('Cleaning up HLS instance and video element');
    
    // First cleanup HLS if it exists
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
        hlsRef.current = null;
      } catch (error) {
        console.error('Error cleaning up HLS instance:', error);
      }
    }
    
    // Then cleanup video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
        const mediaElement = videoRef.current;
        mediaElement.srcObject = null;
        // Remove all source elements
        while (mediaElement.firstChild) {
          mediaElement.removeChild(mediaElement.firstChild);
        }
      } catch (error) {
        console.error('Error cleaning up video element:', error);
      }
    }
  };

  // Cleanup on unmount and URL changes
  useEffect(() => {
    return () => {
      cleanupHls();
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const url = videoUrl || recordingUrl;

    if (!url) {
      console.log('No video URL provided');
      cleanupHls();
      return;
    }

    console.log('Initializing video player with URL:', url);

    // Clean up existing instance before creating a new one
    cleanupHls();

    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        console.log('HLS is supported, initializing player with URL:', url);
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          debug: true // Enable debug logs to help diagnose issues
        });
        
        hls.attachMedia(video);
        hls.loadSource(url);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, attempting playback');
          video.play().catch((error) => {
            console.log('Playback prevented by browser:', error);
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error encountered:', data);
          if (data.fatal) {
            console.error('Fatal HLS error:', data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, attempting to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, attempting to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Unrecoverable HLS error:', data);
                cleanupHls();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS support');
        video.src = url;
      } else {
        console.error('HLS is not supported by this browser!');
      }
    } else {
      // For non-HLS videos
      console.log('Using standard video player with URL:', url);
      video.src = url;
    }

    // Add event listeners for debugging
    video.addEventListener('error', (e) => {
      console.error('Video element error:', video.error);
    });

    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded');
    });

    video.addEventListener('canplay', () => {
      console.log('Video can play');
    });

    return () => {
      cleanupHls();
    };
  }, [videoUrl, recordingUrl]);

  // Expose controls via ref
  useEffect(() => {
    if (!videoRef.current || !ref) return;

    const controls: BaseVideoPlayerRef = {
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
          // Ensure HLS is also stopped when pausing
          if (hlsRef.current) {
            hlsRef.current.stopLoad();
          }
        }
      },
      play: () => {
        if (videoRef.current) {
          // Restart HLS if needed
          if (hlsRef.current) {
            hlsRef.current.startLoad();
          }
          videoRef.current.play().catch(error => {
            console.error('Error playing video:', error);
          });
        }
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getVideoElement: () => videoRef.current,
      cleanup: cleanupHls
    };

    if (typeof ref === 'function') {
      ref(controls);
    } else {
      ref.current = controls;
    }
  }, [ref]);

  if (!videoUrl && !recordingUrl) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
        No video available
      </div>
    );
  }

  const handleDownload = () => {
    if (muxPlaybackId) {
      downloadVideo(muxPlaybackId, title);
    }
  };

  return (
    <div 
      className="relative w-full h-full" 
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        preload="auto"
      >
        Your browser does not support the video tag.
      </video>
      
      {muxPlaybackId && showControls && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="secondary" 
                size="icon" 
                className={cn(
                  "h-8 w-8 rounded-full bg-black/50 hover:bg-black/70",
                  "text-white border-none shadow-md"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});

BaseVideoPlayer.displayName = "BaseVideoPlayer";
