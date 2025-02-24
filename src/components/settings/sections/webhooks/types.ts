
export interface WebhookLog {
  id: string;
  received_at: string;
  webhook_type: string;
  grant_id: string;
  request_id: string;
  status: string;
  error_message: string | null;
  raw_payload: any;
  created_at: string;
  user_id: string | null;
  // Related data from webhook_relationships
  relationship?: {
    event_id: string | null;
    recording_id: string | null;
    notetaker_id: string | null;
  };
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
