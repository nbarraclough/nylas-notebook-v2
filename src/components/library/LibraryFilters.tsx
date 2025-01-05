import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { OwnerFilter } from "./filters/OwnerFilter";
import { MeetingTypeFilter } from "./filters/MeetingTypeFilter";
import { DateFilter } from "./filters/DateFilter";
import { ParticipantFilter } from "./filters/ParticipantFilter";
import { TitleFilter } from "./filters/TitleFilter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LibraryFiltersProps {
  filters: {
    types: string[];
    meetingTypes: string[];
    startDate: Date | null;
    endDate: Date | null;
    participants: string[];
    titleSearch: string | null;
    hasPublicLink: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

export function LibraryFilters({ filters, onFiltersChange }: LibraryFiltersProps) {
  const clearFilter = (filterKey: string, value?: string) => {
    if (filterKey === "types" || filterKey === "meetingTypes" || filterKey === "participants") {
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
    } else if (filterKey === "titleSearch") {
      onFiltersChange({
        ...filters,
        titleSearch: null,
      });
    } else if (filterKey === "hasPublicLink") {
      onFiltersChange({
        ...filters,
        hasPublicLink: false,
      });
    }
  };

  const handleParticipantSearch = (email: string) => {
    onFiltersChange({
      ...filters,
      participants: [...filters.participants, email],
    });
  };

  const handleTitleSearch = (title: string) => {
    onFiltersChange({
      ...filters,
      titleSearch: title,
    });
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

    filters.participants.forEach((email) => {
      badges.push(
        <Badge key={`participant-${email}`} variant="secondary" className="gap-1">
          Participant: {email}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("participants", email)}
          />
        </Badge>
      );
    });

    if (filters.titleSearch) {
      badges.push(
        <Badge key="title" variant="secondary" className="gap-1">
          Title: {filters.titleSearch}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("titleSearch")}
          />
        </Badge>
      );
    }

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

    if (filters.hasPublicLink) {
      badges.push(
        <Badge key="public-link" variant="secondary" className="gap-1">
          Has Public Link
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => clearFilter("hasPublicLink")}
          />
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
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
        <div className="flex flex-wrap gap-2">
          <ParticipantFilter onParticipantSearch={handleParticipantSearch} />
          <TitleFilter onTitleSearch={handleTitleSearch} />
          <div className="flex items-center space-x-2">
            <Switch
              id="public-link"
              checked={filters.hasPublicLink}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, hasPublicLink: checked })
              }
            />
            <Label htmlFor="public-link">Public Link</Label>
          </div>
        </div>
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
                participants: [],
                titleSearch: null,
                hasPublicLink: false,
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