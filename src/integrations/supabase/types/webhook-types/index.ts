export * from './base';
export * from './event';
export * from './grant';
export * from './message';

export type NylasWebhookPayload = 
  | import('./grant').GrantCreatedWebhook 
  | import('./grant').GrantUpdatedWebhook 
  | import('./grant').GrantDeletedWebhook 
  | import('./grant').GrantExpiredWebhook
  | import('./event').EventCreatedWebhook
  | import('./event').EventUpdatedWebhook
  | import('./event').EventDeletedWebhook
  | import('./message').MessageOpenedWebhook
  | import('./message').MessageLinkClickedWebhook;