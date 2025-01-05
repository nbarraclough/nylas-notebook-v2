import { TranscriptViewer } from "./TranscriptViewer";
import type { Json } from "@/integrations/supabase/types";

interface TranscriptSectionProps {
  content: Json;
}

export function TranscriptSection({ content }: TranscriptSectionProps) {
  return (
    <div className="h-full">
      <h3 className="text-lg font-medium mb-4">Transcript</h3>
      <TranscriptViewer content={content as any} />
    </div>
  );
}