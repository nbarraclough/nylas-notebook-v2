import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MeetingTypeFilterProps {
  selectedTypes: string[];
  onTypeChange: (types: string[]) => void;
}

export function MeetingTypeFilter({ selectedTypes, onTypeChange }: MeetingTypeFilterProps) {
  const handleSelection = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          Filter by meeting type
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-2 space-y-2">
          <Button
            variant={selectedTypes.includes("internal") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleSelection("internal")}
          >
            Internal
          </Button>
          <Button
            variant={selectedTypes.includes("external") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleSelection("external")}
          >
            External
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}