
export interface WebhookLog {
  id: string;
  received_at: string;
  webhook_type: string;
  notetaker_id: string | null;
  grant_id: string | null;
  request_id: string;
  status: string;
  error_message: string | null;
  raw_payload: any;
  event_id: string | null;
  recording_id: string | null;
  previous_state: string | null;
  new_state: string | null;
}

export const ITEMS_PER_PAGE = 10;

export const WEBHOOK_TYPES = [
  "all",
  "notetaker.status_updated",
  "notetaker.meeting_state",
  "notetaker.media",
  "event.created",
  "event.updated",
  "event.deleted",
] as const;

export const STATUS_TYPES = ["all", "success", "error"] as const;

