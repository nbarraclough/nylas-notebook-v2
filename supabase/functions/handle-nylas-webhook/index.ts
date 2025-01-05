import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { validateWebhook } from './webhook-validator.ts'
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantCreated,
  handleGrantUpdated,
  handleGrantDeleted,
  handleGrantExpired
} from '../_shared/webhook-handlers.ts'

// Log function initialization
console.log('🚀 Webhook handler function initialized:', new Date().toISOString());

serve(async (req) => {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  
  // Enhanced request logging
  console.log(`\n=== New Request ${requestId} ===`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 Method: ${req.method}`);
  console.log(`🔗 URL: ${req.url}`);
  
  // Detailed headers logging
  const headers = Object.fromEntries(req.headers.entries());
  console.log('📋 Headers:', JSON.stringify(headers, null, 2));

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`✈️ [${requestId}] CORS preflight request`);
      return new Response(null, { 
        headers: corsHeaders
      });
    }

    // Verify it's a POST request
    if (req.method !== 'POST') {
      console.error(`❌ [${requestId}] Invalid method: ${req.method}. Webhooks only accept POST requests.`);
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          message: 'This webhook endpoint only accepts POST requests.',
          allowedMethods: ['POST', 'OPTIONS']
        }), 
        { 
          status: 405, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Allow': 'POST, OPTIONS'
          } 
        }
      );
    }

    // Get and log raw body
    const rawBody = await req.text();
    console.log(`📦 [${requestId}] Raw body length: ${rawBody.length}`);
    console.log(`📦 [${requestId}] Raw body preview: ${rawBody.substring(0, 200)}...`);

    try {
      // Parse webhook data
      const webhookData = JSON.parse(rawBody);
      console.log(`📥 [${requestId}] Webhook type: ${webhookData.type}`);
      console.log(`📥 [${requestId}] Webhook data:`, JSON.stringify(webhookData, null, 2));

      // Validate webhook signature
      const signature = req.headers.get('x-nylas-signature');
      console.log(`🔐 [${requestId}] Validating signature: ${signature}`);
      
      const { isValid } = await validateWebhook(rawBody, signature);
      if (!isValid) {
        console.error(`❌ [${requestId}] Invalid webhook signature`);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process webhook based on type
      let processingResult;
      console.log(`🔄 [${requestId}] Processing webhook type: ${webhookData.type}`);
      
      switch (webhookData.type) {
        case 'event.created':
          processingResult = await handleEventCreated(webhookData.data.object, webhookData.data.grant_id);
          break;
        case 'event.updated':
          processingResult = await handleEventUpdated(webhookData.data.object, webhookData.data.grant_id);
          break;
        case 'event.deleted':
          processingResult = await handleEventDeleted(webhookData.data.object, webhookData.data.grant_id);
          break;
        case 'grant.created':
          processingResult = await handleGrantCreated(webhookData.data);
          break;
        case 'grant.updated':
          processingResult = await handleGrantUpdated(webhookData.data);
          break;
        case 'grant.deleted':
          processingResult = await handleGrantDeleted(webhookData.data);
          break;
        case 'grant.expired':
          processingResult = await handleGrantExpired(webhookData.data);
          break;
        default:
          console.warn(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
          return new Response(
            JSON.stringify({
              success: false,
              message: `Unhandled webhook type: ${webhookData.type}`,
              status: 'acknowledged'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }

      const endTime = performance.now();
      console.log(`✅ [${requestId}] Webhook processed successfully in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`✅ [${requestId}] Processing result:`, JSON.stringify(processingResult, null, 2));

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully processed ${webhookData.type} webhook`,
          result: processingResult,
          status: 'acknowledged'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (parseError) {
      console.error(`❌ [${requestId}] Error parsing webhook JSON:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON payload',
          details: parseError.message
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ [${requestId}] Webhook error after ${(endTime - startTime).toFixed(2)}ms:`, {
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
