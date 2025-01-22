export interface NotetakerStatusData {
  status: 'joining' | 'waiting_for_admission' | 'failed_entry' | 'attending' | 'leaving' | 'concluded';
  notetaker_id: string;
}

export interface NotetakerMediaData {
  status: 'media_available' | 'processing';
  notetaker_id: string;
}

export interface NylasWebhookBase<T = any> {
  type: string;
  id: string;
  data: {
    application_id: string;
    grant_id: string;
    object: T;
  };
}

export type NylasWebhookPayload = 
  | GrantWebhook
  | EventWebhook
  | NotetakerWebhook;

interface GrantWebhook extends NylasWebhookBase {
  type: 'grant.created' | 'grant.updated' | 'grant.deleted' | 'grant.expired';
}

interface EventWebhook extends NylasWebhookBase {
  type: 'event.created' | 'event.updated' | 'event.deleted';
}

interface NotetakerWebhook extends NylasWebhookBase<NotetakerStatusData | NotetakerMediaData> {
  type: 'notetaker.status_updated' | 'notetaker.media_updated';
}