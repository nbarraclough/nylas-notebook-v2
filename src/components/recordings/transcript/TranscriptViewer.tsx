import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptEntry {
  timestamp: number;
  speaker: string;
  text: string;
}

interface TranscriptViewerProps {
  content: TranscriptEntry[];
}

export function TranscriptViewer({ content }: TranscriptViewerProps) {
  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {content.map((entry, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {formatTimestamp(entry.timestamp)}
              </span>
              <span className="text-sm font-semibold text-primary">
                {entry.speaker}
              </span>
            </div>
            <p className="text-sm text-foreground">{entry.text}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}