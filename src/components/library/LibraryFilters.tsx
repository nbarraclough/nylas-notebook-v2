import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Users, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface LibraryFiltersProps {
  filters: {
    type: string | null;
    meetingType: string | null;
    startDate: Date | null;
    endDate: Date | null;
  };
  onFiltersChange: (filters: any) => void;
}

export function LibraryFilters({ filters, onFiltersChange }: LibraryFiltersProps) {
  const clearFilter = (filterKey: string) => {
    onFiltersChange({ ...filters, [filterKey]: null });
  };

  const renderFilterBadges = () => {
    const badges = [];

    if (filters.type) {
      badges.push(
        <Badge
          key="type"
          variant="secondary"
          className="gap-1"
        >
          {filters.type === "my-recordings" ? "My Recordings" : "Organization"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("type")}
          />
        </Badge>
      );
    }

    if (filters.meetingType) {
      badges.push(
        <Badge
          key="meetingType"
          variant="secondary"
          className="gap-1"
        >
          {filters.meetingType === "internal" ? "Internal" : "External"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("meetingType")}
          />
        </Badge>
      );
    }

    if (filters.startDate) {
      badges.push(
        <Badge
          key="date"
          variant="secondary"
          className="gap-1"
        >
          {format(filters.startDate, "LLL dd, y")} -{" "}
          {filters.endDate ? format(filters.endDate, "LLL dd, y") : "Present"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => {
              onFiltersChange({
                ...filters,
                startDate: null,
                endDate: null,
              });
            }}
          />
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Filter by owner
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() =>
                  onFiltersChange({ ...filters, type: "my-recordings" })
                }
              >
                My recordings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() =>
                  onFiltersChange({ ...filters, type: "organization" })
                }
              >
                Organization
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              Filter by meeting type
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() =>
                  onFiltersChange({ ...filters, meetingType: "internal" })
                }
              >
                Internal
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() =>
                  onFiltersChange({ ...filters, meetingType: "external" })
                }
              >
                External
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Filter by date
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

      {renderFilterBadges().length > 0 && (
        <div className="flex flex-wrap gap-2">
          {renderFilterBadges()}
          {renderFilterBadges().length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onFiltersChange({
                  type: null,
                  meetingType: null,
                  startDate: null,
                  endDate: null,
                })
              }
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}