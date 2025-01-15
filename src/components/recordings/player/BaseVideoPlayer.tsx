import { forwardRef, useEffect, useRef } from "react";
import Hls from "hls.js";

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
        console.log('HLS is supported, initializing player with URL:', url);
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, attempting playback');
          video.play().catch((error) => {
            console.log('Playback prevented by browser:', error);
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
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
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari which has built-in HLS support
        console.log('Using native HLS support');
        video.src = url;
      }
    } else {
      // For non-HLS videos
      console.log('Using standard video player with URL:', url);
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        console.log('Cleaning up HLS instance');
        hlsRef.current.destroy();
      }
    };
  }, [videoUrl, recordingUrl]);

  // Expose player controls through ref
  useEffect(() => {
    if (!videoRef.current) return;

    if (ref) {
      const controls = {
        pause: () => videoRef.current?.pause(),
        play: () => videoRef.current?.play(),
        seek: (time: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time;
          }
        }
      };

      if (typeof ref === 'function') {
        ref(controls);
      } else {
        ref.current = controls;
      }
    }
  }, [ref]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full"
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload"
    >
      Your browser does not support the video tag.
    </video>
  );
});

BaseVideoPlayer.displayName = "BaseVideoPlayer";