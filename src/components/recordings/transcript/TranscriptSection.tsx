
import { TranscriptViewer } from "./TranscriptViewer";
import type { Json } from "@/integrations/supabase/types";
import type { BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";
import { FileText } from "lucide-react";

interface TranscriptSectionProps {
  content: Json;
  videoRef?: React.RefObject<BaseVideoPlayerRef>;
}

export function TranscriptSection({ content, videoRef }: TranscriptSectionProps) {
  const hasContent = content && (
    (Array.isArray(content) && content.length > 0) || 
    (typeof content === 'object' && Object.keys(content).length > 0)
  );

  return (
    <div className="h-full">
      <h3 className="text-lg font-medium mb-4">Transcript</h3>
      
      {hasContent ? (
        <TranscriptViewer content={content as any} videoRef={videoRef} />
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <FileText className="h-12 w-12 mb-2 text-gray-300" />
          <p>No transcript available</p>
        </div>
      )}
    </div>
  );
}
