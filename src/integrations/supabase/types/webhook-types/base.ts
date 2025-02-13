
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
  | 'concluded'
  | 'scheduled'
  | 'connecting'
  | 'disconnected'
  | 'waiting_for_entry';

export interface NotetakerStatusData {
  status: NotetakerStatus;
  notetaker_id: string;
}

export interface NotetakerUpdateData {
  id: string;
  grant_id: string;
  meeting_settings: {
    video_recording: boolean;
    audio_recording: boolean;
    transcription: boolean;
  };
  join_time?: number;
  calendar_id?: string;
  event?: {
    ical_uid?: string;
    event_id?: string;
    master_event_id?: string;
  };
  object: 'notetaker';
  status: NotetakerStatus;
}

export interface NotetakerStatusWebhook extends NylasWebhookBase<NotetakerStatusData> {
  type: 'notetaker.status_updated';
}

export interface NotetakerUpdateWebhook extends NylasWebhookBase<NotetakerUpdateData> {
  type: 'notetaker.updated';
}
