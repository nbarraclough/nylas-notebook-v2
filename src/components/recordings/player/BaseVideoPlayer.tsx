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
}

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({
  videoUrl,
  recordingUrl,
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