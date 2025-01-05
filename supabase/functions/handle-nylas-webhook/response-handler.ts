import { corsHeaders } from '../_shared/cors.ts';

export const createWebhookResponse = (success: boolean, message: string, result?: any, status = 200) => {
  return new Response(
    JSON.stringify({ 
      success,
      message,
      result,
      status: 'acknowledged'
    }), 
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};