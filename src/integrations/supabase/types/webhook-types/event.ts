import { NylasWebhookBase } from './base';

interface EventWebhookData {
  account_id: string;
  busy: boolean;
  calendar_id: string;
  conferencing?: {
    details: {
      meeting_code?: string;
      phone?: string[];
      pin?: string;
      url?: string;
    };
    provider: string;
  };
  created_at: number;
  creator?: {
    email: string;
    name: string;
  };
  description?: string;
  grant_id: string;
  hide_participants?: boolean;
  html_link?: string;
  ical_uid?: string;
  id: string;
  object: 'event';
  occurrences?: string[];
  organizer?: {
    email: string;
    name: string;
  };
  participants?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  read_only?: boolean;
  recurrence?: string[];
  reminders?: {
    overrides: any[];
    use_default: boolean;
  };
  resources?: any[];
  status?: string;
  title: string;
  updated_at: number;
  visibility?: string;
  when: {
    end_time: number;
    end_timezone?: string;
    object: 'timespan';
    start_time: number;
    start_timezone?: string;
  };
}

export interface EventCreatedWebhook extends NylasWebhookBase<EventWebhookData> {
  type: 'event.created';
  webhook_delivery_attempt?: number;
}

export interface EventUpdatedWebhook extends NylasWebhookBase<EventWebhookData & { master_event_id?: string }> {
  type: 'event.updated';
  webhook_delivery_attempt?: number;
}

export interface EventDeletedWebhook extends NylasWebhookBase<{
  grant_id: string;
  calendar_id: string;
  id: string;
  master_event_id?: string;
  object: 'event';
}> {
  type: 'event.deleted';
}