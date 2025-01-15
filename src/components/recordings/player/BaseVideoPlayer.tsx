import { forwardRef, useEffect, useRef } from "react";
import Hls from "hls.js";
import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BaseVideoPlayerRef {
  pause: () => void;
  play: () => void;
  seek: (time: number) => void;
}

interface BaseVideoPlayerProps {
  videoUrl: string | null;
  recordingUrl: string | null;
  onRefreshMedia?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({
  videoUrl,
  recordingUrl,
  onRefreshMedia,
  isRefreshing
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Initialize HLS if we have a Mux stream URL
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const url = videoUrl || recordingUrl;

    if (!url) return;

    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // If it's a Mux HLS stream
    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            console.log('Playback prevented by browser');
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
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
                console.error('Fatal HLS error:', data);
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari which has built-in HLS support
        video.src = url;
      }
    } else {
      // For non-HLS videos
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoUrl, recordingUrl]);

  // Expose player controls through ref
  useEffect(() => {
    if (!videoRef.current) return;

    if (ref) {
      if (typeof ref === 'function') {
        ref({
          pause: () => videoRef.current?.pause(),
          play: () => videoRef.current?.play(),
          seek: (time: number) => {
            if (videoRef.current) {
              videoRef.current.currentTime = time;
            }
          }
        });
      } else {
        ref.current = {
          pause: () => videoRef.current?.pause(),
          play: () => videoRef.current?.play(),
          seek: (time: number) => {
            if (videoRef.current) {
              videoRef.current.currentTime = time;
            }
          }
        };
      }
    }
  }, [ref]);

  return (
    <div className="relative w-full h-full group">
      {/* Loading State */}
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Loader className="w-8 h-8 text-[#9b87f5] animate-spin" />
        </div>
      )}
      
      {/* Video Player */}
      <video
        ref={videoRef}
        className={cn(
          "w-full h-full rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-[#9b87f5]/20",
          // Custom styles for video controls
          "[&::-webkit-media-controls-panel]:bg-background/80 [&::-webkit-media-controls-panel]:backdrop-blur-sm",
          "[&::-webkit-media-controls-play-button]:hover:text-[#9b87f5]",
          "[&::-webkit-media-controls-timeline]:accent-[#9b87f5]",
          "[&::-webkit-media-controls-volume-slider]:accent-[#9b87f5]",
          "[&::-webkit-media-controls-current-time-display]:font-sans [&::-webkit-media-controls-current-time-display]:text-base",
          "[&::-webkit-media-controls-time-remaining-display]:font-sans [&::-webkit-media-controls-time-remaining-display]:text-base",
          // Error state styling
          "[&::-webkit-media-controls-overlay-error-message]:text-[#9b87f5] [&::-webkit-media-controls-overlay-error-message]:font-sans",
        )}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
      >
        Your browser does not support the video tag.
      </video>

      {/* Custom Error State */}
      {!videoUrl && !recordingUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center space-y-2">
            <div className="text-[#9b87f5] font-medium">Video not available</div>
            <button
              onClick={() => onRefreshMedia?.()}
              className="text-sm text-muted-foreground hover:text-[#9b87f5] transition-colors"
            >
              Try refreshing
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

BaseVideoPlayer.displayName = "BaseVideoPlayer";