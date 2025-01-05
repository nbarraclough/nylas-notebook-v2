import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { OwnerFilter } from "./filters/OwnerFilter";
import { MeetingTypeFilter } from "./filters/MeetingTypeFilter";
import { DateFilter } from "./filters/DateFilter";

interface LibraryFiltersProps {
  filters: {
    types: string[];
    meetingTypes: string[];
    startDate: Date | null;
    endDate: Date | null;
  };
  onFiltersChange: (filters: any) => void;
}

export function LibraryFilters({ filters, onFiltersChange }: LibraryFiltersProps) {
  const clearFilter = (filterKey: string, value?: string) => {
    if (filterKey === "types" || filterKey === "meetingTypes") {
      if (value) {
        onFiltersChange({
          ...filters,
          [filterKey]: filters[filterKey].filter((t: string) => t !== value),
        });
      } else {
        onFiltersChange({ ...filters, [filterKey]: [] });
      }
    } else if (filterKey === "date") {
      onFiltersChange({
        ...filters,
        startDate: null,
        endDate: null,
      });
    }
  };

  const renderFilterBadges = () => {
    const badges = [];

    filters.types.forEach((type) => {
      badges.push(
        <Badge key={`type-${type}`} variant="secondary" className="gap-1">
          {type === "my-recordings" ? "My Recordings" : "Organization"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("types", type)}
          />
        </Badge>
      );
    });

    filters.meetingTypes.forEach((type) => {
      badges.push(
        <Badge key={`meeting-${type}`} variant="secondary" className="gap-1">
          {type === "internal" ? "Internal" : "External"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("meetingTypes", type)}
          />
        </Badge>
      );
    });

    if (filters.startDate) {
      badges.push(
        <Badge key="date" variant="secondary" className="gap-1">
          {format(filters.startDate, "LLL dd, y")} -{" "}
          {filters.endDate ? format(filters.endDate, "LLL dd, y") : "Present"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("date")}
          />
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <OwnerFilter
          selectedTypes={filters.types}
          onTypeChange={(types) => onFiltersChange({ ...filters, types })}
        />
        <MeetingTypeFilter
          selectedTypes={filters.meetingTypes}
          onTypeChange={(types) => onFiltersChange({ ...filters, meetingTypes: types })}
        />
        <DateFilter
          startDate={filters.startDate}
          endDate={filters.endDate}
          onDateChange={(start, end) =>
            onFiltersChange({
              ...filters,
              startDate: start,
              endDate: end,
            })
          }
        />
      </div>

      {renderFilterBadges().length > 0 && (
        <div className="flex flex-wrap gap-2">
          {renderFilterBadges()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onFiltersChange({
                types: [],
                meetingTypes: [],
                startDate: null,
                endDate: null,
              })
            }
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}