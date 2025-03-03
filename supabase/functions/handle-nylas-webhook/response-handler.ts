
import { corsHeaders } from '../_shared/cors.ts';

export interface WebhookResponseOptions {
  success: boolean;
  message: string;
  status?: number;
  data?: any;
}

export const createWebhookResponse = ({
  success, 
  message, 
  status = success ? 200 : 400,
  data
}: WebhookResponseOptions): Response => {
  return new Response(
    JSON.stringify({ 
      success,
      message,
      data,
      status: 'acknowledged'
    }), 
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

export const createAcknowledgmentResponse = (): Response => {
  return new Response(
    JSON.stringify({ 
      status: 'acknowledged',
      success: true
    }), 
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};
