export interface NylasWebhookBase<T = any> {
  type: string;
  id: string;
  data: {
    application_id: string;
    grant_id: string;
    object: T;
  };
}

export type NotetakerStatus = 
  | 'joining'
  | 'waiting_for_admission'
  | 'failed_entry'
  | 'attending'
  | 'leaving'
  | 'concluded';

export interface NotetakerStatusData {
  status: NotetakerStatus;
  notetaker_id: string;
}

export interface NotetakerStatusWebhook extends NylasWebhookBase<NotetakerStatusData> {
  type: 'notetaker.status_updated';
}