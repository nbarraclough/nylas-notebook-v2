import { NylasWebhookBase } from './base';

interface MessageTrackingRecent {
  ip: string;
  timestamp: number;
  user_agent: string;
}

interface MessageOpenedRecent extends MessageTrackingRecent {
  opened_id: number;
}

interface MessageLinkClickedRecent extends MessageTrackingRecent {
  click_id: string;
  link_index: string;
}

export interface MessageOpenedWebhook extends NylasWebhookBase {
  type: 'message.opened';
  data: {
    application_id: string;
    grant_id: string;
    object: {
      message_data: {
        count: number;
        timestamp: number;
      };
      message_id: string;
      label: string;
      recents: MessageOpenedRecent[];
      sender_app_id: string;
      timestamp: number;
      grant_id: string;
    };
  };
}

export interface MessageLinkClickedWebhook extends NylasWebhookBase {
  type: 'message.link_clicked';
  data: {
    application_id: string;
    grant_id: string;
    object: {
      link_data: Array<{
        count: number;
        url: string;
      }>;
      message_id: string;
      label: string;
      recents: MessageLinkClickedRecent[];
      sender_app_id: string;
      timestamp: number;
      grant_id: string;
    };
  };
}