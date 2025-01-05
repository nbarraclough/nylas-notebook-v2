import { NylasWebhookBase } from './base';

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