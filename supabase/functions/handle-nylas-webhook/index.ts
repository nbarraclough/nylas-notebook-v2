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
  console.log(`📝 [${requestId}] Request method:`, req.method);
  console.log(`📝 [${requestId}] Request URL:`, req.url);

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`🔄 [${requestId}] CORS preflight request`);
      return new Response(null, { 
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        } 
      });
    }

    // Handle GET requests (webhook verification)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const challenge = url.searchParams.get('challenge');
      
      console.log(`🔍 [${requestId}] GET request received`);
      console.log(`🔑 [${requestId}] Challenge parameter:`, challenge);

      if (challenge) {
        console.log(`✅ [${requestId}] Returning challenge:`, challenge);
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }

      console.log(`❌ [${requestId}] GET request without challenge parameter`);
      return new Response('Missing challenge parameter', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Handle POST requests (webhook events)
    if (req.method === 'POST') {
      console.log(`📥 [${requestId}] POST request received`);
      
      const signature = req.headers.get('x-nylas-signature');
      console.log(`🔑 [${requestId}] Signature:`, signature);

      let rawBody;
      try {
        rawBody = await req.text();
        console.log(`📦 [${requestId}] Raw body:`, rawBody);
      } catch (error) {
        console.error(`❌ [${requestId}] Error reading request body:`, error);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to read request body',
            error: error.message
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Validate webhook signature
      const { isValid } = await validateWebhook(rawBody, signature);
      if (!isValid) {
        console.error(`❌ [${requestId}] Invalid webhook signature`);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid signature',
            status: 'error'
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Parse webhook data
      let webhookData;
      try {
        webhookData = JSON.parse(rawBody);
        console.log(`📥 [${requestId}] Webhook type:`, webhookData.type);
        console.log(`🔍 [${requestId}] Webhook data:`, JSON.stringify(webhookData, null, 2));
      } catch (error) {
        console.error(`❌ [${requestId}] Error parsing webhook data:`, error);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid JSON payload',
            error: error.message,
            status: 'error'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Process webhook based on type
      try {
        const grantId = webhookData.data.object.grant_id;
        console.log(`🎫 [${requestId}] Grant ID:`, grantId);
        
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
        console.error(`❌ [${requestId}] Error processing webhook:`, error);
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
    }

    // Handle unsupported methods
    console.log(`⚠️ [${requestId}] Unsupported method: ${req.method}`);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Method ${req.method} not allowed`,
        status: 'error'
      }),
      { 
        status: 405,
        headers: { 
          ...corsHeaders,
          'Allow': 'POST, GET, OPTIONS',
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Unhandled error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
        status: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})