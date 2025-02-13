
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { 
  logWebhookRequest, 
  logRawBody, 
  logParsedWebhook, 
  logWebhookError 
} from '../_shared/webhook-logger.ts'
import { handleWebhookType } from '../_shared/webhook-type-handlers.ts'

const SUPPORTED_WEBHOOK_TYPES = [
  "grant.created",
  "grant.deleted",
  "grant.expired",
  "event.created",
  "event.updated",
  "event.deleted",
  "notetaker.media",
  "notetaker.media_updated",
  "notetaker.status_updated",
  "notetaker.updated",
  "notetaker.meeting_state"
];

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`⚡ [${requestId}] Webhook handler started`);
  
  logWebhookRequest(req);

  try {
    // Handle challenge parameter (for both GET and POST)
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log(`🎯 [${requestId}] Challenge received: ${challenge}`);
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only process webhooks for POST requests
    if (req.method === 'POST') {
      const rawBody = await req.text();
      logRawBody(rawBody);

      // Verify webhook signature
      const signature = req.headers.get('x-nylas-signature');
      const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        logWebhookError('configuration', new Error('NYLAS_WEBHOOK_SECRET not configured'));
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Webhook secret not configured',
            status: 'acknowledged'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const isValid = await verifyWebhookSignature(rawBody, signature || '', webhookSecret);
      if (!isValid) {
        logWebhookError('signature verification', new Error('Invalid webhook signature'));
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid signature',
            status: 'acknowledged'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Parse and process webhook
      const webhookData = JSON.parse(rawBody);
      logParsedWebhook(webhookData);

      // Extract grant ID from webhook data
      const grantId = webhookData.data?.grant_id;
      
      // Handle webhook by type
      const result = await handleWebhookType(webhookData, grantId, requestId);
      
      return new Response(
        JSON.stringify({
          ...result,
          status: 'acknowledged'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Invalid method
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed',
        status: 'acknowledged'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logWebhookError('webhook processing', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        status: 'error'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
