import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Search, Users } from "lucide-react";
import { useState } from "react";

interface RecurringEventsFiltersProps {
  filters: {
    participants: string[];
    startDate: Date | null;
    endDate: Date | null;
    searchQuery: string | null;
  };
  onFiltersChange: (filters: any) => void;
}

export function RecurringEventsFilters({
  filters,
  onFiltersChange,
}: RecurringEventsFiltersProps) {
  const [participantEmail, setParticipantEmail] = useState("");

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (participantEmail && !filters.participants.includes(participantEmail)) {
      onFiltersChange({
        ...filters,
        participants: [...filters.participants, participantEmail],
      });
      setParticipantEmail("");
    }
  };

  const handleRemoveParticipant = (email: string) => {
    onFiltersChange({
      ...filters,
      participants: filters.participants.filter((p) => p !== email),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Date Range
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: filters.startDate || undefined,
                to: filters.endDate || undefined,
              }}
              onSelect={(range) =>
                onFiltersChange({
                  ...filters,
                  startDate: range?.from || null,
                  endDate: range?.to || null,
                })
              }
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <form onSubmit={handleAddParticipant} className="flex gap-2">
          <Input
            type="email"
            placeholder="Filter by participant email"
            value={participantEmail}
            onChange={(e) => setParticipantEmail(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline" size="icon">
            <Users className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search in transcripts..."
            value={filters.searchQuery || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                searchQuery: e.target.value || null,
              })
            }
            className="w-64"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(filters.participants.length > 0 ||
        filters.startDate ||
        filters.searchQuery) && (
        <div className="flex flex-wrap gap-2">
          {filters.participants.map((email) => (
            <Button
              key={email}
              variant="secondary"
              size="sm"
              onClick={() => handleRemoveParticipant(email)}
            >
              {email}
              <span className="ml-2">×</span>
            </Button>
          ))}
          {(filters.startDate || filters.searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onFiltersChange({
                  participants: [],
                  startDate: null,
                  endDate: null,
                  searchQuery: null,
                })
              }
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}