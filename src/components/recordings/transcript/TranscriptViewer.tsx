import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptSearch } from "./TranscriptSearch";

interface TranscriptEntry {
  timestamp: number;
  speaker: string;
  text: string;
}

interface TranscriptViewerProps {
  content: TranscriptEntry[];
}

export function TranscriptViewer({ content }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContent = useMemo(() => {
    if (!searchQuery) return content;
    const query = searchQuery.toLowerCase();
    return content.filter(
      entry => 
        entry.text.toLowerCase().includes(query) ||
        entry.speaker.toLowerCase().includes(query)
    );
  }, [content, searchQuery]);

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
      <TranscriptSearch onSearch={setSearchQuery} />
      <ScrollArea className="h-[400px] w-full rounded-md border">
        <div className="space-y-4 p-4">
          {filteredContent.map((entry, index) => (
            <div 
              key={index} 
              className="group rounded-lg p-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-medium text-muted-foreground min-w-[50px]">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {entry.speaker}
                </span>
              </div>
              <p className="text-sm text-foreground pl-[66px]">
                {highlightText(entry.text)}
              </p>
            </div>
          ))}
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