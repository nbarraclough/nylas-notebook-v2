export interface NylasWebhookBase<T = Record<string, any>> {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time: number;
  data: {
    application_id: string;
    grant_id?: string;
    object: T;
  };
}