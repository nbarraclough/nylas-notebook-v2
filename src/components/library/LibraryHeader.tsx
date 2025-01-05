import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

interface LibraryHeaderProps {
  recordingsCount: number;
}

export function LibraryHeader({ recordingsCount }: LibraryHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground">
          {recordingsCount} recordings
        </p>
      </div>
      <Button>
        <Video className="mr-2 h-4 w-4" />
        New recording
      </Button>
    </div>
  );
}