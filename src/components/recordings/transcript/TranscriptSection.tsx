import { TranscriptViewer } from "./TranscriptViewer";
import type { Json } from "@/integrations/supabase/types";
import type { BaseVideoPlayerRef } from "@/components/recordings/player/BaseVideoPlayer";

interface TranscriptSectionProps {
  content: Json;
  videoRef?: React.RefObject<BaseVideoPlayerRef>;
}

export function TranscriptSection({ content, videoRef }: TranscriptSectionProps) {
  return (
    <div className="h-full">
      <h3 className="text-lg font-medium mb-4">Transcript</h3>
      <TranscriptViewer content={content as any} videoRef={videoRef} />
    </div>
  );
}