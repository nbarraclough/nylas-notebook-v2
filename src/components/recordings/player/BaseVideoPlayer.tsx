import { forwardRef, useEffect, useRef } from "react";
import Hls from "hls.js";

export interface BaseVideoPlayerRef {
  pause: () => void;
  play: () => void;
  seek: (time: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
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

  // Cleanup function to properly destroy HLS instance
  const cleanupHls = () => {
    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.detachMedia();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const url = videoUrl || recordingUrl;

    if (!url) {
      console.log('No video URL provided');
      return;
    }

    // Clean up existing HLS instance before creating a new one
    cleanupHls();

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
        console.log('Using native HLS support');
        video.src = url;
      }
    }

    return () => {
      cleanupHls();
    };
  }, [videoUrl, recordingUrl]);

  useEffect(() => {
    if (!videoRef.current) return;

    if (ref) {
      const controls = {
        pause: () => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        },
        play: () => {
          if (videoRef.current) {
            videoRef.current.play();
          }
        },
        seek: (time: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time;
          }
        },
        getVideoElement: () => videoRef.current
      };

      if (typeof ref === 'function') {
        ref(controls);
      } else {
        ref.current = controls;
      }
    }
  }, [ref]);

  if (!videoUrl && !recordingUrl) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
        No video available
      </div>
    );
  }

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