export * from './base';
export * from './message';
export * from './event';
export * from './grant';

export type NylasWebhookPayload = 
  | import('./grant').GrantCreatedWebhook 
  | import('./grant').GrantUpdatedWebhook 
  | import('./grant').GrantDeletedWebhook 
  | import('./grant').GrantExpiredWebhook
  | import('./event').EventCreatedWebhook
  | import('./event').EventUpdatedWebhook
  | import('./event').EventDeletedWebhook
  | import('./message').MessageOpenedWebhook
  | import('./message').MessageLinkClickedWebhook
  | import('./base').NotetakerStatusWebhook;