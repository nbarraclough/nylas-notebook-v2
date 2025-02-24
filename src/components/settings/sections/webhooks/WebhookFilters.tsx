
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WEBHOOK_TYPES, STATUS_TYPES } from "./types";

interface WebhookFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  webhookType: string;
  setWebhookType: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}

export function WebhookFilters({
  search,
  setSearch,
  webhookType,
  setWebhookType,
  status,
  setStatus,
}: WebhookFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search webhooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={webhookType} onValueChange={setWebhookType}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Webhook type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {WEBHOOK_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {STATUS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

