import { forwardRef, useEffect, useRef } from "react";
import Hls from "hls.js";

export interface BaseVideoPlayerRef {
  pause: () => void;
  play: () => void;
  seek: (time: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  cleanup: () => void;
}

interface BaseVideoPlayerProps {
  muxPlaybackId?: string | null;
}

export const BaseVideoPlayer = forwardRef<BaseVideoPlayerRef, BaseVideoPlayerProps>(({
  muxPlaybackId
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const cleanupHls = () => {
    if (hlsRef.current) {
      try {
        console.log('Cleaning up HLS instance');
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
        hlsRef.current = null;
      } catch (error) {
        console.error('Error cleaning up HLS instance:', error);
      }
    }
    
    if (videoRef.current) {
      try {
        console.log('Cleaning up video element');
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
        const mediaElement = videoRef.current;
        mediaElement.srcObject = null;
      } catch (error) {
        console.error('Error cleaning up video element:', error);
      }
    }
  };

  useEffect(() => {
    if (!videoRef.current || !muxPlaybackId) {
      cleanupHls();
      return;
    }

    const video = videoRef.current;
    const url = `https://stream.mux.com/${muxPlaybackId}.m3u8`;

    // Clean up existing instance before creating a new one
    cleanupHls();

    if (Hls.isSupported()) {
      console.log('HLS is supported, initializing player with URL:', url);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hlsRef.current = hls;
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
              cleanupHls();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('Using native HLS support');
      video.src = url;
    }

    return () => {
      cleanupHls();
    };
  }, [muxPlaybackId]);

  useEffect(() => {
    if (!videoRef.current || !ref) return;

    const controls: BaseVideoPlayerRef = {
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
          if (hlsRef.current) {
            hlsRef.current.stopLoad();
          }
        }
      },
      play: () => {
        if (videoRef.current) {
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