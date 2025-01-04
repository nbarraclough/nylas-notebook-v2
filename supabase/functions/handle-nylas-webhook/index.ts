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
    // Log every incoming request
    logWebhookRequest(req);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('🔄 Processing CORS preflight request');
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Handle challenge parameter in URL - this is required for Nylas webhook verification
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

      // Get the webhook secret
      const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('NYLAS_WEBHOOK_SECRET not configured');
      }

      // Get the signature (try both cases)
      const signature = req.headers.get('x-nylas-signature') || req.headers.get('X-Nylas-Signature');
      if (!signature) {
        throw new Error('No signature in webhook request');
      }

      // Get and log the raw request body
      const rawBody = await req.text();
      const webhookData = logWebhookBody(rawBody);
      if (!webhookData) {
        throw new Error('Invalid webhook data');
      }

      // Verify signature
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      logSignatureVerification(isValid);

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on type
      const grantId = webhookData.data.object.grant_id;
      console.log(`🎯 [${timestamp}] Processing webhook type:`, webhookData.type, 'for grant:', grantId);

      try {
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
          stack: error.stack
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
        stack: error.stack
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