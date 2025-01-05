import { NylasWebhookBase } from './base';

interface GrantObject {
  code?: number;
  grant_id: string;
}

interface GrantCreatedObject extends GrantObject {
  integration_id: string;
  login_id: string;
  provider: string;
}

interface GrantUpdatedObject extends GrantObject {
  integration_id: string;
  provider: string;
  reauthentication_flag: boolean;
}

interface GrantExpiredObject extends GrantCreatedObject {}

export interface GrantCreatedWebhook extends NylasWebhookBase<GrantCreatedObject> {
  type: 'grant.created';
}

export interface GrantUpdatedWebhook extends NylasWebhookBase<GrantUpdatedObject> {
  type: 'grant.updated';
}

export interface GrantDeletedWebhook extends NylasWebhookBase<GrantObject> {
  type: 'grant.deleted';
}

export interface GrantExpiredWebhook extends NylasWebhookBase<GrantExpiredObject> {
  type: 'grant.expired';
}