import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";

interface DateFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
}

export function DateFilter({ startDate, endDate, onDateChange }: DateFilterProps) {
  return (
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
            from: startDate || undefined,
            to: endDate || undefined,
          }}
          onSelect={(range) =>
            onDateChange(range?.from || null, range?.to || null)
          }
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}