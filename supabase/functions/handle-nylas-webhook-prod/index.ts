import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { logWebhookRequest, logWebhookBody, logSignatureVerification } from '../_shared/webhook-logger.ts'

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`⚡ [${requestId}] Production webhook handler started at ${new Date().toISOString()}`);

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`🔄 [${requestId}] CORS preflight request`);
      return new Response(null, { 
        headers: corsHeaders 
      });
    }

    // Verify it's a POST request
    if (req.method !== 'POST') {
      console.error(`❌ [${requestId}] Invalid request method: ${req.method}`);
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Log request details
    logWebhookRequest(req);

    // Handle challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    if (challenge) {
      console.log(`🎯 [${requestId}] Challenge received:`, challenge);
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Get signature and body
    const signature = req.headers.get('x-nylas-signature');
    console.log(`🔑 [${requestId}] Signature received:`, signature);
    
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get('NYLAS_PROD_WEBHOOK_SECRET');

    // Validate webhook
    if (!webhookSecret) {
      console.error(`❌ [${requestId}] NYLAS_PROD_WEBHOOK_SECRET not configured`);
      throw new Error('NYLAS_PROD_WEBHOOK_SECRET not configured');
    }

    const isValid = await verifyWebhookSignature(rawBody, signature || '', webhookSecret);
    logSignatureVerification(isValid);
    
    if (!isValid) {
      console.error(`❌ [${requestId}] Invalid webhook signature`);
      return new Response('Invalid signature', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Log webhook data
    const webhookData = logWebhookBody(rawBody);
    console.log(`✅ [${requestId}] Successfully logged webhook data`);

    // Return acknowledgment
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and logged',
        status: 'acknowledged'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Webhook error:`, {
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        status: 'acknowledged'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})