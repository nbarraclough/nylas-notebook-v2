import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { logWebhookRequest, logWebhookBody, logSignatureVerification } from '../_shared/webhook-logger.ts'

serve(async (req) => {
  // Log every incoming request
  logWebhookRequest(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔄 Processing CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('🎯 Challenge request received:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        }
      });
    }

    // Get the webhook secret
    const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ NYLAS_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the signature (try both cases)
    const signature = req.headers.get('x-nylas-signature') || req.headers.get('X-Nylas-Signature');
    if (!signature) {
      console.error('❌ No signature in webhook request');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get and log the raw request body
    const rawBody = await req.text();
    const webhookData = logWebhookBody(rawBody);

    // Verify signature
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    logSignatureVerification(isValid);

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ success: true }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Fatal error processing webhook:', error);
    console.error('Error stack:', error.stack);
    // Still return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})