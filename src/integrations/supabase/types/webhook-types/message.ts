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

interface MessageOpenedObject {
  message_data: {
    count: number;
    timestamp: number;
  };
  message_id: string;
  label: string;
  recents: MessageOpenedRecent[];
  sender_app_id: string;
  timestamp: number;
}

interface MessageLinkClickedObject {
  link_data: Array<{
    count: number;
    url: string;
  }>;
  message_id: string;
  label: string;
  recents: MessageLinkClickedRecent[];
  sender_app_id: string;
  timestamp: number;
}

export interface MessageOpenedWebhook extends NylasWebhookBase<MessageOpenedObject> {
  type: 'message.opened';
}

export interface MessageLinkClickedWebhook extends NylasWebhookBase<MessageLinkClickedObject> {
  type: 'message.link_clicked';
}