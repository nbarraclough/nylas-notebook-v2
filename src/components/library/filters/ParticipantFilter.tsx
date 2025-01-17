import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface ParticipantFilterProps {
  onParticipantSearch: (email: string) => void;
}

export function ParticipantFilter({ onParticipantSearch }: ParticipantFilterProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onParticipantSearch(email.trim());
      setEmail("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        type="email"
        placeholder="Search by participant email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" variant="outline" size="icon" className="shrink-0">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}