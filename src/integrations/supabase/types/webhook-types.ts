
import type { Json } from './json';
import type { NylasWebhookBase } from './webhook-types/base';
import type {
  GrantCreatedWebhook,
  GrantUpdatedWebhook,
  GrantDeletedWebhook,
  GrantExpiredWebhook
} from './webhook-types/grant';
import type {
  EventCreatedWebhook,
  EventUpdatedWebhook,
  EventDeletedWebhook
} from './webhook-types/event';

interface NotetakerMeetingSettings {
  video_recording: boolean;
  audio_recording: boolean;
  transcription: boolean;
}

interface NotetakerEventInfo {
  ical_uid?: string;
  event_id?: string;
  master_event_id?: string;
}

interface NotetakerData {
  id: string;
  grant_id: string;
  meeting_settings: NotetakerMeetingSettings;
  join_time?: number;
  calendar_id?: string;
  event?: NotetakerEventInfo;
  object: 'notetaker';
  status: string;
}

interface NotetakerCreatedWebhook extends NylasWebhookBase<NotetakerData> {
  type: 'notetaker.created';
}

export type NylasWebhookPayload = 
  | GrantCreatedWebhook 
  | GrantUpdatedWebhook 
  | GrantDeletedWebhook 
  | GrantExpiredWebhook
  | EventCreatedWebhook
  | EventUpdatedWebhook
  | EventDeletedWebhook
  | NotetakerCreatedWebhook;
