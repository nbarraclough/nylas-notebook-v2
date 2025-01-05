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

serve(async (req) => {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  console.log(`⚡ [${requestId}] Webhook handler started at ${new Date().toISOString()}`);
  console.log(`📝 [${requestId}] Request URL:`, req.url);
  console.log(`📝 [${requestId}] Request method:`, req.method);
  console.log(`📝 [${requestId}] Request headers:`, Object.fromEntries(req.headers.entries()));

  try {
    // Handle CORS preflight with detailed logging
    if (req.method === 'OPTIONS') {
      console.log(`🔄 [${requestId}] CORS preflight request`);
      return new Response(null, { 
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Max-Age': '86400',
        } 
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

    // Get signature and body with validation logging
    const signature = req.headers.get('x-nylas-signature');
    console.log(`🔑 [${requestId}] Signature received:`, signature);
    
    const rawBody = await req.text();
    console.log(`📦 [${requestId}] Raw body received:`, rawBody);
    
    // Validate webhook immediately with detailed logging
    const { isValid } = await validateWebhook(rawBody, signature);
    console.log(`✅ [${requestId}] Signature validation:`, isValid);
    
    if (!isValid) {
      console.error(`❌ [${requestId}] Invalid webhook signature`);
      return new Response('Invalid signature', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Parse webhook data after validation
    const webhookData = JSON.parse(rawBody);
    console.log(`📥 [${requestId}] Webhook type:`, webhookData.type);
    console.log(`🔍 [${requestId}] Webhook data:`, JSON.stringify(webhookData, null, 2));

    const grantId = webhookData.data.object.grant_id;
    console.log(`🎫 [${requestId}] Grant ID:`, grantId);
    
    // Process webhook based on type with enhanced logging
    let processingResult;
    switch (webhookData.type) {
      case 'event.created':
        console.log(`📅 [${requestId}] Processing event.created`);
        processingResult = await handleEventCreated(webhookData.data.object, grantId);
        break;
      case 'event.updated':
        console.log(`📝 [${requestId}] Processing event.updated`);
        processingResult = await handleEventUpdated(webhookData.data.object, grantId);
        break;
      case 'event.deleted':
        console.log(`🗑️ [${requestId}] Processing event.deleted`);
        processingResult = await handleEventDeleted(webhookData.data.object, grantId);
        break;
      case 'grant.created':
        console.log(`🔑 [${requestId}] Processing grant.created`);
        processingResult = await handleGrantCreated(webhookData.data);
        break;
      case 'grant.updated':
        console.log(`📝 [${requestId}] Processing grant.updated`);
        processingResult = await handleGrantUpdated(webhookData.data);
        break;
      case 'grant.deleted':
        console.log(`🗑️ [${requestId}] Processing grant.deleted`);
        processingResult = await handleGrantDeleted(webhookData.data);
        break;
      case 'grant.expired':
        console.log(`⚠️ [${requestId}] Processing grant.expired`);
        processingResult = await handleGrantExpired(webhookData.data);
        break;
      default:
        console.warn(`⚠️ [${requestId}] Unhandled webhook type:`, webhookData.type);
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
    console.log(`✅ [${requestId}] Webhook processed in ${endTime - startTime}ms:`, {
      type: webhookData.type,
      result: processingResult
    });

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