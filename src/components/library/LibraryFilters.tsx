import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";

interface LibraryFiltersProps {
  filters: {
    type: string;
    meetingType: string;
    startDate: Date | null;
    endDate: Date | null;
  };
  onFiltersChange: (filters: any) => void;
}

export function LibraryFilters({ filters, onFiltersChange }: LibraryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <Tabs
        value={filters.type}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, type: value })
        }
      >
        <TabsList>
          <TabsTrigger value="my-recordings">My recordings</TabsTrigger>
          <TabsTrigger value="organization">
            <Users className="mr-2 h-4 w-4" />
            Organization
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs
        value={filters.meetingType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, meetingType: value })
        }
      >
        <TabsList>
          <TabsTrigger value="all">All meetings</TabsTrigger>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>
      </Tabs>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.startDate ? (
              <>
                {format(filters.startDate, "LLL dd, y")} -{" "}
                {filters.endDate
                  ? format(filters.endDate, "LLL dd, y")
                  : "Present"}
              </>
            ) : (
              "Pick a date range"
            )}
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
    </div>
  );
}