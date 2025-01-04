export interface NylasWebhookBase {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time: number;
  data: {
    application_id: string;
    object: {
      code?: number;
      grant_id: string;
    };
  };
}

export interface GrantCreatedWebhook extends NylasWebhookBase {
  type: 'grant.created';
  data: {
    application_id: string;
    object: {
      code: number;
      grant_id: string;
      integration_id: string;
      login_id: string;
      provider: string;
    };
  };
}

export interface GrantUpdatedWebhook extends NylasWebhookBase {
  type: 'grant.updated';
  data: {
    application_id: string;
    object: {
      code: number;
      grant_id: string;
      integration_id: string;
      provider: string;
      reauthentication_flag: boolean;
    };
  };
}

export interface GrantDeletedWebhook extends NylasWebhookBase {
  type: 'grant.deleted';
}

export interface GrantExpiredWebhook extends NylasWebhookBase {
  type: 'grant.expired';
  data: {
    application_id: string;
    object: {
      code: number;
      grant_id: string;
      integration_id: string;
      login_id: string;
      provider: string;
    };
  };
}

export interface EventCreatedWebhook extends NylasWebhookBase {
  type: 'event.created';
  webhook_delivery_attempt?: number;
  data: {
    application_id: string;
    object: {
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
    };
  };
}

export interface EventUpdatedWebhook extends EventCreatedWebhook {
  type: 'event.updated';
  data: {
    application_id: string;
    object: {
      master_event_id?: string;
    } & EventCreatedWebhook['data']['object'];
  };
}

export interface EventDeletedWebhook extends NylasWebhookBase {
  type: 'event.deleted';
  data: {
    application_id: string;
    object: {
      grant_id: string;
      calendar_id: string;
      id: string;
      master_event_id?: string;
      object: 'event';
    };
  };
}

export type NylasWebhookPayload = 
  | GrantCreatedWebhook 
  | GrantUpdatedWebhook 
  | GrantDeletedWebhook 
  | GrantExpiredWebhook
  | EventCreatedWebhook
  | EventUpdatedWebhook
  | EventDeletedWebhook;