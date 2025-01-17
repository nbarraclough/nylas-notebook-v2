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
import { cn } from "@/lib/utils";

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

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'my-recordings':
      case 'organization':
        return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200';
      case 'internal':
        return 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200';
      case 'external':
        return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200';
      case 'participant':
        return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200';
      case 'title':
        return 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200';
      case 'date':
        return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200';
      case 'public-link':
        return 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200';
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200';
    }
  };

  const renderFilterBadges = () => {
    const badges = [];

    filters.types.forEach((type) => {
      badges.push(
        <Badge 
          key={`type-${type}`} 
          variant="outline"
          className={cn("gap-1 transition-colors", getBadgeStyle('my-recordings'))}
        >
          {type === "my-recordings" ? "My Recordings" : "Organization"}
          <X
            className="h-3 w-3 cursor-pointer hover:text-blue-900"
            onClick={() => clearFilter("types", type)}
          />
        </Badge>
      );
    });

    filters.meetingTypes.forEach((type) => {
      badges.push(
        <Badge 
          key={`meeting-${type}`} 
          variant="outline"
          className={cn("gap-1 transition-colors", getBadgeStyle(type))}
        >
          {type === "internal" ? "Internal" : "External"}
          <X
            className="h-3 w-3 cursor-pointer hover:text-purple-900"
            onClick={() => clearFilter("meetingTypes", type)}
          />
        </Badge>
      );
    });

    filters.participants.forEach((email) => {
      badges.push(
        <Badge 
          key={`participant-${email}`} 
          variant="outline"
          className={cn("gap-1 transition-colors", getBadgeStyle('participant'))}
        >
          Participant: {email}
          <X
            className="h-3 w-3 cursor-pointer hover:text-amber-900"
            onClick={() => clearFilter("participants", email)}
          />
        </Badge>
      );
    });

    if (filters.titleSearch) {
      badges.push(
        <Badge 
          key="title" 
          variant="outline"
          className={cn("gap-1 transition-colors", getBadgeStyle('title'))}
        >
          Title: {filters.titleSearch}
          <X
            className="h-3 w-3 cursor-pointer hover:text-rose-900"
            onClick={() => clearFilter("titleSearch")}
          />
        </Badge>
      );
    }

    if (filters.startDate) {
      badges.push(
        <Badge 
          key="date" 
          variant="outline"
          className={cn("gap-1 transition-colors", getBadgeStyle('date'))}
        >
          {format(filters.startDate, "LLL dd, y")} -{" "}
          {filters.endDate ? format(filters.endDate, "LLL dd, y") : "Present"}
          <X
            className="h-3 w-3 cursor-pointer hover:text-indigo-900"
            onClick={() => clearFilter("date")}
          />
        </Badge>
      );
    }

    if (filters.hasPublicLink) {
      badges.push(
        <Badge 
          key="public-link" 
          variant="outline"
          className={cn("gap-1 transition-colors", getBadgeStyle('public-link'))}
        >
          Has Public Link
          <X
            className="h-3 w-3 cursor-pointer hover:text-teal-900"
            onClick={() => clearFilter("hasPublicLink")}
          />
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Primary Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {/* Search Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[280px] max-w-xl flex items-center gap-4">
            <div className="flex-1">
              <ParticipantFilter onParticipantSearch={handleParticipantSearch} />
            </div>
            <div className="flex-1">
              <TitleFilter onTitleSearch={handleTitleSearch} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="public-link"
              checked={filters.hasPublicLink}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, hasPublicLink: checked })
              }
            />
            <Label htmlFor="public-link" className="text-sm font-medium">
              Public Link
            </Label>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {renderFilterBadges().length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {renderFilterBadges()}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
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