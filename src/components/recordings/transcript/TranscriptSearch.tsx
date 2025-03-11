
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TranscriptSearchProps {
  onSearch: (query: string) => void;
}

export function TranscriptSearch({ onSearch }: TranscriptSearchProps) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search transcript..."
        className="pl-9 border-gray-200 focus-visible:ring-primary/20 transition-all"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}
