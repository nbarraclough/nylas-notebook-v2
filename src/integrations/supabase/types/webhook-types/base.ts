
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

export type NotetakerMeetingState =
  | 'api'
  | 'bad_meeting_code'
  | 'dispatched'
  | 'entry_denied'
  | 'internal_error'
  | 'kicked'
  | 'no_meeting_activity'
  | 'no_participants'
  | 'no_response'
  | 'recording_active'
  | 'waiting_for_entry';

export type NotetakerMediaStatus =
  | 'available'
  | 'deleted'
  | 'error'
  | 'processing';

export interface NotetakerMedia {
  recording?: string;
  transcript?: string;
}

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

export interface NotetakerMeetingStateData {
  id: string;
  grant_id: string;
  calendar_id?: string;
  event?: {
    ical_uid?: string;
    event_id?: string;
    master_event_id?: string;
  };
  object: 'notetaker';
  status: NotetakerStatus;
  meeting_state: NotetakerMeetingState;
}

export interface NotetakerMediaData {
  id: string;
  grant_id: string;
  calendar_id?: string;
  event?: {
    ical_uid?: string;
    event_id?: string;
    master_event_id?: string;
  };
  object: 'notetaker';
  status: NotetakerMediaStatus;
  media?: NotetakerMedia;
}

export interface NotetakerStatusWebhook extends NylasWebhookBase<NotetakerStatusData> {
  type: 'notetaker.status_updated';
}

export interface NotetakerUpdateWebhook extends NylasWebhookBase<NotetakerUpdateData> {
  type: 'notetaker.updated';
}

export interface NotetakerMeetingStateWebhook extends NylasWebhookBase<NotetakerMeetingStateData> {
  type: 'notetaker.meeting_state';
}

export interface NotetakerMediaWebhook extends NylasWebhookBase<NotetakerMediaData> {
  type: 'notetaker.media';
}
