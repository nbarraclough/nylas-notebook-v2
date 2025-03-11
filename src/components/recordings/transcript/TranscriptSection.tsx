
import { TranscriptViewer } from "./TranscriptViewer";
import type { Json } from "@/integrations/supabase/types";
import type { BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";
import { FileText, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TranscriptSectionProps {
  content: Json;
  videoRef?: React.RefObject<BaseVideoPlayerRef>;
}

export function TranscriptSection({ content, videoRef }: TranscriptSectionProps) {
  const [validatedContent, setValidatedContent] = useState<any[]>([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!content) {
      setValidatedContent([]);
      return;
    }

    try {
      // Handle different possible content formats
      let transcriptData: any[] = [];
      
      if (Array.isArray(content)) {
        transcriptData = content;
      } else if (typeof content === 'object') {
        if (content.transcript && Array.isArray(content.transcript)) {
          transcriptData = content.transcript;
        } else if (content.entries && Array.isArray(content.entries)) {
          transcriptData = content.entries;
        } else if (content.segments && Array.isArray(content.segments)) {
          transcriptData = content.segments;
        }
      }
      
      // Validate structure - each entry should have start, end, speaker, and text
      const isValid = transcriptData.length > 0 && 
        transcriptData.every(entry => (
          (typeof entry.start === 'number' || typeof entry.start_time === 'number') &&
          (typeof entry.end === 'number' || typeof entry.end_time === 'number') &&
          (typeof entry.text === 'string' || typeof entry.content === 'string')
        ));
      
      if (isValid) {
        // Normalize data format if needed
        const normalizedData = transcriptData.map(entry => ({
          start: entry.start !== undefined ? entry.start : (entry.start_time || 0),
          end: entry.end !== undefined ? entry.end : (entry.end_time || 0),
          speaker: entry.speaker || (entry.speaker_id ? `Speaker ${entry.speaker_id}` : 'Unknown'),
          text: entry.text || entry.content || ''
        }));
        
        setValidatedContent(normalizedData);
        setHasError(false);
      } else {
        console.error("Invalid transcript format:", transcriptData);
        setHasError(true);
        setValidatedContent([]);
      }
    } catch (error) {
      console.error("Error processing transcript content:", error, content);
      setHasError(true);
      setValidatedContent([]);
    }
  }, [content]);

  const hasContent = validatedContent && validatedContent.length > 0;

  return (
    <div className={cn(
      "h-full p-5",
      "rounded-lg bg-white/80 dark:bg-gray-900/70",
      "backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800"
    )}>
      <h3 className="text-lg font-medium mb-5 text-gray-800 dark:text-gray-200">
        Transcript
      </h3>
      
      {hasContent ? (
        <TranscriptViewer content={validatedContent} videoRef={videoRef} />
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          {hasError ? (
            <>
              <AlertCircle className="h-12 w-12 mb-3 text-amber-500" />
              <p className="text-base font-medium">There was a problem processing the transcript</p>
              <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">The transcript format is not supported or is corrupted</p>
            </>
          ) : (
            <>
              <FileText className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-base font-medium">No transcript available</p>
              <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">This recording does not have a transcript</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
