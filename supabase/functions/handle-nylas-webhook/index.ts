import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { 
  logWebhookRequest, 
  logRawBody, 
  logParsedWebhook, 
  logWebhookError,
  logWebhookSuccess
} from '../_shared/webhook-logger.ts'

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`⚡ [${requestId}] Webhook handler started`);
  
  // Log request details
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
        throw new Error('NYLAS_WEBHOOK_SECRET not configured');
      }

      const isValid = await verifyWebhookSignature(rawBody, signature || '', webhookSecret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Parse and process webhook
      const webhookData = JSON.parse(rawBody);
      logParsedWebhook(webhookData);

      // Handle notetaker webhooks
      if (webhookData.type.startsWith('notetaker.')) {
        console.log(`📝 [${requestId}] Processing ${webhookData.type} webhook`);
        logWebhookSuccess(webhookData.type);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully processed ${webhookData.type} webhook`,
            status: 'acknowledged'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Unhandled webhook type
      console.log(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Unhandled webhook type: ${webhookData.type}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Invalid method
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    logWebhookError('webhook processing', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        status: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})