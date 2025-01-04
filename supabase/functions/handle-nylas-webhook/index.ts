import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { logWebhookRequest, logWebhookBody, logSignatureVerification } from '../_shared/webhook-logger.ts'
import { handleEventCreated, handleEventUpdated, handleEventDeleted } from '../_shared/handlers/event-handlers.ts'
import { handleGrantCreated, handleGrantUpdated, handleGrantDeleted, handleGrantExpired } from '../_shared/handlers/user-handlers.ts'

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
    if (!webhookData) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify signature
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    logSignatureVerification(isValid);

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process webhook based on type
    const grantId = webhookData.data.object.grant_id;
    console.log('🎯 Processing webhook type:', webhookData.type, 'for grant:', grantId);

    switch (webhookData.type) {
      case 'event.created':
        console.log('📅 Processing event.created webhook');
        await handleEventCreated(webhookData.data.object, grantId);
        break;
      case 'event.updated':
        console.log('🔄 Processing event.updated webhook');
        await handleEventUpdated(webhookData.data.object, grantId);
        break;
      case 'event.deleted':
        console.log('🗑️ Processing event.deleted webhook');
        await handleEventDeleted(webhookData.data.object, grantId);
        break;
      case 'grant.created':
        console.log('🔑 Processing grant.created webhook');
        await handleGrantCreated(webhookData.data);
        break;
      case 'grant.updated':
        console.log('🔄 Processing grant.updated webhook');
        await handleGrantUpdated(webhookData.data);
        break;
      case 'grant.deleted':
        console.log('🗑️ Processing grant.deleted webhook');
        await handleGrantDeleted(webhookData.data);
        break;
      case 'grant.expired':
        console.log('⚠️ Processing grant.expired webhook');
        await handleGrantExpired(webhookData.data);
        break;
      default:
        console.log('⚠️ Unhandled webhook type:', webhookData.type);
    }

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