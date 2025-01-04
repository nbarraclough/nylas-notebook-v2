import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { logWebhookRequest, logWebhookBody, logSignatureVerification } from '../_shared/webhook-logger.ts'
import { handleEventCreated, handleEventUpdated, handleEventDeleted } from '../_shared/handlers/event-handlers.ts'
import { handleGrantCreated, handleGrantUpdated, handleGrantDeleted, handleGrantExpired } from '../_shared/handlers/user-handlers.ts'

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`⚡ [${timestamp}] Webhook handler started`);
  
  try {
    // Log every incoming request with headers
    logWebhookRequest(req);
    console.log('📨 Request headers:', Object.fromEntries(req.headers.entries()));

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
        console.log('🎯 Nylas webhook challenge received:', challenge);
        return new Response(challenge, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain',
          }
        });
      }

      // Get and validate webhook secret
      const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
      if (!webhookSecret) {
        console.error('❌ NYLAS_WEBHOOK_SECRET not configured');
        throw new Error('NYLAS_WEBHOOK_SECRET not configured');
      }

      // Get and validate signature
      const signature = req.headers.get('x-nylas-signature') || req.headers.get('X-Nylas-Signature');
      if (!signature) {
        console.error('❌ No signature in webhook request');
        throw new Error('No signature in webhook request');
      }

      // Get and log the raw request body
      const rawBody = await req.text();
      console.log('📦 Raw webhook body:', rawBody);
      
      const webhookData = logWebhookBody(rawBody);
      if (!webhookData) {
        console.error('❌ Invalid webhook data');
        throw new Error('Invalid webhook data');
      }

      // Verify signature and log result
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      logSignatureVerification(isValid);

      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on type
      const grantId = webhookData.data.object.grant_id;
      console.log(`🎯 [${timestamp}] Processing webhook:`, {
        type: webhookData.type,
        grantId,
        objectData: webhookData.data.object
      });

      try {
        switch (webhookData.type) {
          case 'event.created':
            console.log('📅 Processing event.created webhook:', webhookData.data.object);
            await handleEventCreated(webhookData.data.object, grantId);
            break;
          case 'event.updated':
            console.log('🔄 Processing event.updated webhook:', webhookData.data.object);
            await handleEventUpdated(webhookData.data.object, grantId);
            break;
          case 'event.deleted':
            console.log('🗑️ Processing event.deleted webhook:', webhookData.data.object);
            await handleEventDeleted(webhookData.data.object, grantId);
            break;
          case 'grant.created':
            console.log('🔑 Processing grant.created webhook:', webhookData.data);
            await handleGrantCreated(webhookData.data);
            break;
          case 'grant.updated':
            console.log('🔄 Processing grant.updated webhook:', webhookData.data);
            await handleGrantUpdated(webhookData.data);
            break;
          case 'grant.deleted':
            console.log('🗑️ Processing grant.deleted webhook:', webhookData.data);
            await handleGrantDeleted(webhookData.data);
            break;
          case 'grant.expired':
            console.log('⚠️ Processing grant.expired webhook:', webhookData.data);
            await handleGrantExpired(webhookData.data);
            break;
          default:
            console.log('⚠️ Unhandled webhook type:', webhookData.type);
        }

        console.log(`✅ [${timestamp}] Successfully processed webhook:`, webhookData.type);
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Successfully processed ${webhookData.type} webhook`,
            status: 'acknowledged'
          }), 
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        // Log the specific error from webhook processing
        console.error(`❌ [${timestamp}] Error processing ${webhookData.type} webhook:`, {
          error: error.message,
          stack: error.stack,
          data: webhookData.data
        });
        
        // Still return 200 to acknowledge receipt
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error processing ${webhookData.type} webhook: ${error.message}`,
            status: 'acknowledged'
          }), 
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

    } catch (error) {
      // Log validation/setup errors
      console.error(`❌ [${timestamp}] Webhook validation error:`, {
        error: error.message,
        stack: error.stack,
        headers: Object.fromEntries(req.headers.entries())
      });
      
      // Return 200 even for validation errors to acknowledge receipt
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message,
          status: 'acknowledged'
        }), 
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    // Log fatal errors
    console.error(`❌ [${timestamp}] Fatal error in webhook handler:`, {
      error: error.message,
      stack: error.stack
    });
    
    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        status: 'acknowledged'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})