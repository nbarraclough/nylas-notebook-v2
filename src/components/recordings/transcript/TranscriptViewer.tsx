import { useState, useMemo, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptSearch } from "./TranscriptSearch";
import type { BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";

interface TranscriptEntry {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface TranscriptViewerProps {
  content: TranscriptEntry[];
  videoRef?: React.RefObject<BaseVideoPlayerRef>;
}

export function TranscriptViewer({ content, videoRef }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrollRef = useRef(false);

  const filteredContent = useMemo(() => {
    if (!searchQuery) return content;
    const query = searchQuery.toLowerCase();
    return content.filter(
      entry => 
        entry.text.toLowerCase().includes(query) ||
        entry.speaker.toLowerCase().includes(query)
    );
  }, [content, searchQuery]);

  const formatTimestamp = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    setCurrentTime(video.currentTime * 1000); // Convert to milliseconds
  };

  useEffect(() => {
    if (!videoRef?.current) return;
    
    const videoElement = videoRef.current.getVideoElement();
    if (!videoElement) return;

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef]);

  const handleEntryClick = (timestamp: number) => {
    if (!videoRef?.current) return;
    
    const videoElement = videoRef.current.getVideoElement();
    if (videoElement) {
      videoElement.currentTime = timestamp / 1000; // Convert to seconds
    }
  };

  const handleScroll = () => {
    if (!userScrollRef.current) return;
    setIsAutoScrollEnabled(false);
  };

  useEffect(() => {
    if (!isAutoScrollEnabled || !scrollContainerRef.current) return;

    const currentEntry = filteredContent.find(
      entry => currentTime >= entry.start && currentTime <= entry.end
    );

    if (!currentEntry) return;

    const entryElement = document.getElementById(`transcript-${currentEntry.start}`);
    if (!entryElement) return;

    userScrollRef.current = false;
    entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentTime, isAutoScrollEnabled, filteredContent]);

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? 
        <span key={i} className="bg-yellow-100 dark:bg-yellow-900">{part}</span> : 
        part
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TranscriptSearch onSearch={setSearchQuery} />
        <button
          onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
          className={`text-sm px-3 py-1 rounded-md transition-colors ${
            isAutoScrollEnabled 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Auto-scroll: {isAutoScrollEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <ScrollArea 
        className="h-[400px] w-full rounded-md border"
        onWheel={() => {
          userScrollRef.current = true;
          handleScroll();
        }}
      >
        <div ref={scrollContainerRef} className="space-y-4 p-4">
          {filteredContent.map((entry, index) => {
            const isCurrentSegment = currentTime >= entry.start && currentTime <= entry.end;
            
            return (
              <div 
                key={index}
                id={`transcript-${entry.start}`}
                className={`group rounded-lg p-2 transition-colors cursor-pointer hover:bg-muted/50 ${
                  isCurrentSegment ? 'bg-muted/50 border-l-2 border-primary' : ''
                }`}
                onClick={() => handleEntryClick(entry.start)}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-medium text-muted-foreground min-w-[50px]">
                    {formatTimestamp(entry.start)}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {entry.speaker}
                  </span>
                </div>
                <p className="text-sm text-foreground pl-[66px]">
                  {highlightText(entry.text)}
                </p>
              </div>
            );
          })}
          {filteredContent.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
