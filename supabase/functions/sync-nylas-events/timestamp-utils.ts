
import { format } from "https://deno.land/std@0.168.0/datetime/mod.ts";

export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Convert to Unix timestamp in seconds (not milliseconds)
export function getUnixTime(date: Date): number {
  // This returns seconds, which is what Nylas API expects
  return Math.floor(date.getTime() / 1000);
}

// Format for debugging
export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
