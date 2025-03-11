
import { useState, useMemo, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptSearch } from "./TranscriptSearch";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";
import { cn } from "@/lib/utils";

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
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrollRef = useRef(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  const sortedContent = useMemo(() => {
    return [...content].sort((a, b) => a.start - b.start);
  }, [content]);

  const filteredContent = useMemo(() => {
    if (!searchQuery) return sortedContent;
    const query = searchQuery.toLowerCase();
    return sortedContent.filter(
      entry => 
        entry.text.toLowerCase().includes(query) ||
        entry.speaker.toLowerCase().includes(query)
    );
  }, [sortedContent, searchQuery]);

  // Clear copied state after unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const formatTimestamp = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    setCurrentTime(video.currentTime * 1000);
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
      videoElement.currentTime = timestamp / 1000;
      if (videoElement.paused) {
        videoElement.play().catch(err => console.error("Error playing video:", err));
      }
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

  const formatTranscriptForCopy = (entries: TranscriptEntry[]) => {
    return entries.map(entry => {
      const timestamp = formatTimestamp(entry.start);
      return `[${timestamp}] ${entry.speaker}: ${entry.text}`;
    }).join('\n\n');
  };

  const handleCopyTranscript = async () => {
    try {
      setIsCopying(true);
      const formattedText = formatTranscriptForCopy(filteredContent);
      await navigator.clipboard.writeText(formattedText);
      
      setIsCopied(true);
      setIsCopying(false);
      
      toast({
        title: "Copied!",
        description: "Transcript copied to clipboard",
      });
      
      // Reset the copied state after 2 seconds
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      setIsCopying(false);
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <TranscriptSearch onSearch={setSearchQuery} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyTranscript}
            disabled={isCopying || filteredContent.length === 0}
            isLoading={isCopying}
            className={cn(
              "transition-all duration-300 flex items-center gap-2 min-w-[140px]",
              isCopied && "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            )}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Transcript</span>
              </>
            )}
          </Button>
          <Button
            variant={isAutoScrollEnabled ? "default" : "secondary"}
            size="sm"
            onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
            className="min-w-[120px] transition-all duration-200"
          >
            Auto-scroll: {isAutoScrollEnabled ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      <ScrollArea 
        className="h-[400px] w-full rounded-md border border-gray-200 shadow-sm bg-white/50 backdrop-blur-sm"
        onWheel={() => {
          userScrollRef.current = true;
          handleScroll();
        }}
      >
        <div ref={scrollContainerRef} className="space-y-4 p-4">
          {filteredContent.length > 0 ? (
            filteredContent.map((entry, index) => {
              const isCurrentSegment = currentTime >= entry.start && currentTime <= entry.end;
              
              return (
                <div 
                  key={index}
                  id={`transcript-${entry.start}`}
                  className={cn(
                    "group rounded-lg p-3 transition-colors cursor-pointer hover:bg-muted/50",
                    isCurrentSegment ? 'bg-muted/50 border-l-2 border-primary shadow-sm' : ''
                  )}
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
            })
          ) : searchQuery ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg">No results found for "{searchQuery}"</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg">No transcript segments found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
