import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface TitleFilterProps {
  onTitleSearch: (title: string) => void;
}

export function TitleFilter({ onTitleSearch }: TitleFilterProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onTitleSearch(title.trim());
      setTitle("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Search by meeting title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-64"
      />
      <Button type="submit" variant="outline" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}