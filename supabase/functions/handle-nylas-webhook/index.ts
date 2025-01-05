import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantCreated,
  handleGrantUpdated,
  handleGrantDeleted,
  handleGrantExpired
} from '../_shared/webhook-handlers.ts'

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`⚡ [${requestId}] Webhook handler started at ${new Date().toISOString()}`);

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`🔄 [${requestId}] CORS preflight request`);
      return new Response(null, { 
        headers: corsHeaders 
      });
    }

    // Log request details
    console.log(`🔍 [${requestId}] Request details:`, {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Handle challenge parameter in URL for both GET and POST requests
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    if (challenge) {
      console.log(`🎯 [${requestId}] Challenge received:`, challenge);
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Only proceed with webhook processing for POST requests
    if (req.method === 'POST') {
      // Get signature and body
      const signature = req.headers.get('x-nylas-signature');
      console.log(`🔑 [${requestId}] Signature received:`, signature);
      
      const rawBody = await req.text();
      console.log(`📦 [${requestId}] Raw webhook body:`, rawBody);
      
      const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');

      // Validate webhook
      if (!webhookSecret) {
        console.error(`❌ [${requestId}] NYLAS_WEBHOOK_SECRET not configured`);
        throw new Error('NYLAS_WEBHOOK_SECRET not configured');
      }

      const isValid = await verifyWebhookSignature(rawBody, signature || '', webhookSecret);
      console.log(`🔐 [${requestId}] Signature validation:`, isValid ? 'valid' : 'invalid');
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Invalid webhook signature`);
        return new Response('Invalid signature', { 
          status: 401,
          headers: corsHeaders 
        });
      }

      // Parse webhook data
      let webhookData;
      try {
        webhookData = JSON.parse(rawBody);
        console.log(`✅ [${requestId}] Successfully parsed webhook data:`, webhookData);
      } catch (error) {
        console.error(`❌ [${requestId}] Failed to parse webhook data:`, error);
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid JSON payload' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Process webhook based on type
      try {
        const grantId = webhookData.data.object.grant_id;
        let result;
        
        console.log(`🎯 [${requestId}] Processing webhook type:`, webhookData.type);
        
        switch (webhookData.type) {
          case 'event.created':
            result = await handleEventCreated(webhookData.data.object, grantId);
            break;
          case 'event.updated':
            result = await handleEventUpdated(webhookData.data.object, grantId);
            break;
          case 'event.deleted':
            result = await handleEventDeleted(webhookData.data.object, grantId);
            break;
          case 'grant.created':
            result = await handleGrantCreated(webhookData.data);
            break;
          case 'grant.updated':
            result = await handleGrantUpdated(webhookData.data);
            break;
          case 'grant.deleted':
            result = await handleGrantDeleted(webhookData.data);
            break;
          case 'grant.expired':
            result = await handleGrantExpired(webhookData.data);
            break;
          default:
            console.log(`⚠️ [${requestId}] Unhandled webhook type:`, webhookData.type);
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

        console.log(`✅ [${requestId}] Successfully processed webhook:`, {
          type: webhookData.type,
          result
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully processed ${webhookData.type} webhook`,
            result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`❌ [${requestId}] Error processing webhook:`, error);
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // If we get here, it's a non-POST request without a challenge
    console.error(`❌ [${requestId}] Invalid request method: ${req.method}`);
    return new Response(`Method not allowed`, { 
      status: 405,
      headers: corsHeaders 
    });

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