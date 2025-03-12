
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";

interface TranscriptSearchProps {
  onSearch: (query: string) => void;
}

export function TranscriptSearch({ onSearch }: TranscriptSearchProps) {
  const [searchValue, setSearchValue] = useState("");
  
  // Debounce the search function to avoid excessive re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchValue);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);
  
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search transcript..."
        className="pl-9 border-gray-200 focus-visible:ring-primary/20 transition-all"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
      />
    </div>
  );
}
