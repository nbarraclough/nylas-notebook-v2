
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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function logWebhook(requestId: string, webhookData: any, status = 'success', errorMessage?: string) {
  const notetakerId = webhookData?.data?.object?.id;
  const grantId = webhookData?.data?.grant_id || webhookData?.data?.object?.grant_id;
  const webhookType = webhookData?.type;

  try {
    const { error } = await supabase
      .from('webhook_logs')
      .insert({
        request_id: requestId,
        webhook_type: webhookType,
        notetaker_id: notetakerId,
        grant_id: grantId,
        raw_payload: webhookData,
        status,
        error_message: errorMessage
      });

    if (error) {
      console.error(`Failed to log webhook: ${error.message}`);
    }
  } catch (error) {
    console.error('Error logging webhook:', error);
  }
}

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
        const error = new Error('NYLAS_WEBHOOK_SECRET not configured');
        await logWebhook(requestId, JSON.parse(rawBody), 'error', error.message);
        logWebhookError('configuration', error);
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
        const error = new Error('Invalid webhook signature');
        await logWebhook(requestId, JSON.parse(rawBody), 'error', error.message);
        logWebhookError('signature verification', error);
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

      // Log the webhook before processing
      await logWebhook(requestId, webhookData);

      // Extract grant ID from webhook data
      const grantId = webhookData.data?.grant_id;
      
      // Handle webhook by type
      const result = await handleWebhookType(webhookData, grantId, requestId);
      
      // Update log status if there was an error
      if (!result.success) {
        await logWebhook(requestId, webhookData, 'error', result.message);
      }

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
    // Log the error in webhook_logs if we can parse the body
    try {
      const rawBody = await req.text();
      const webhookData = JSON.parse(rawBody);
      await logWebhook(requestId, webhookData, 'error', error.message);
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

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
