
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
                cleanupHls();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS support');
        video.src = url;
      }
    } else if (url) {
      // For non-HLS videos
      console.log('Using standard video player with URL:', url);
      video.src = url;
    }

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
