import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users } from "lucide-react";

interface OwnerFilterProps {
  selectedTypes: string[];
  onTypeChange: (types: string[]) => void;
}

export function OwnerFilter({ selectedTypes, onTypeChange }: OwnerFilterProps) {
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
          <Users className="mr-2 h-4 w-4" />
          Filter by owner
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-2 space-y-2">
          <Button
            variant={selectedTypes.includes("my-recordings") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleSelection("my-recordings")}
          >
            My recordings
          </Button>
          <Button
            variant={selectedTypes.includes("organization") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleSelection("organization")}
          >
            Organization
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}