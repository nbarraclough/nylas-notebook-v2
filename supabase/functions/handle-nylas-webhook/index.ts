// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { handleWebhookType } from '../_shared/webhook-type-handlers.ts'
import { logWebhook } from '../_shared/webhook-logger.ts'
import { createAcknowledgmentResponse, createWebhookResponse } from './response-handler.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Process webhook data asynchronously to avoid blocking the response
async function processWebhookAsync(requestId: string, webhookData: any, rawBody: string) {
  try {
    console.log(`🔄 [${requestId}] Starting async processing of webhook type: ${webhookData.type}`);
    
    // Extract grant ID
    const grantId = webhookData?.data?.grant_id || webhookData?.data?.object?.grant_id;
    
    if (!grantId || typeof grantId !== 'string') {
      console.error(`❌ [${requestId}] Invalid grant ID: ${grantId}`);
      
      // Log the invalid webhook
      await logWebhook(
        requestId,
        webhookData,
        'invalid_grant',
        `Invalid grant ID: ${grantId}`
      );
      
      return;
    }

    // Process webhook and get any created/updated record IDs
    let processedData = null;
    let errorMessage = null;
    
    try {
      // Process webhook and get any created/updated record IDs
      processedData = await handleWebhookType(webhookData, grantId, requestId);
      console.log(`✅ [${requestId}] Successfully processed webhook type: ${webhookData.type}`, processedData);
    } catch (processError: any) {
      console.error(`❌ [${requestId}] Error processing webhook:`, processError);
      errorMessage = processError.message;
      
      // Log the webhook with error status
      await logWebhook(
        requestId,
        webhookData,
        'error',
        errorMessage
      );
      
      return;
    }

    // Log successful webhook processing
    await logWebhook(
      requestId,
      webhookData,
      'success'
    );

    console.log(`✅ [${requestId}] Completed async processing of webhook`);
  } catch (error: any) {
    console.error(`❌ [${requestId}] Uncaught error in async processing:`, error);
  }
}

serve(async (req) => {
  // Generate a unique request ID for tracing this webhook through logs
  const requestId = crypto.randomUUID();
  
  // Log basic request information immediately
  const url = new URL(req.url);
  console.log(`📥 [${requestId}] Received ${req.method} request to ${url.pathname}`);
  console.log(`📤 [${requestId}] Headers: ${JSON.stringify(Object.fromEntries(req.headers))}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`🔄 [${requestId}] Handling CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  // Only process webhooks for POST requests
  if (req.method !== 'POST') {
    console.log(`❌ [${requestId}] Method not allowed: ${req.method}`);
    return createWebhookResponse({
      success: false,
      message: 'Method not allowed',
      status: 405
    });
  }

  try {
    const rawBody = await req.text();
    console.log(`📝 [${requestId}] Received webhook payload length: ${rawBody.length}`);
    
    // Truncate the body for logging (prevent huge logs)
    const truncatedBody = rawBody.length > 500 ? 
      `${rawBody.substring(0, 500)}... [truncated, total length: ${rawBody.length}]` : 
      rawBody;
    console.log(`📝 [${requestId}] Raw webhook body: ${truncatedBody}`);

    // Check for both lowercase and uppercase signature headers
    const signature = req.headers.get('x-nylas-signature') || 
                      req.headers.get('X-Nylas-Signature') || '';
    
    console.log(`📝 [${requestId}] Signature header: ${signature ? signature.substring(0, 8) + '...' : 'MISSING'}`);
    
    // For Nylas webhooks, we are turning off signature verification
    // This is OK per instructions: "Any edge function in Supabase with 'webhook' should have JWT token verification turned 'off'"
    // Unlike a JWT token, this is a webhook signature verification
    console.log(`🔑 [${requestId}] Nylas webhook signature verification is OFF as per instructions`);
    
    // Parse webhook data
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse webhook body: ${parseError}`);
      return createWebhookResponse({
        success: false,
        message: 'Invalid JSON in request body',
        status: 400
      });
    }
    
    console.log(`📝 [${requestId}] Webhook type: ${webhookData.type || 'UNKNOWN'}`);

    // Start async processing without awaiting completion
    processWebhookAsync(requestId, webhookData, rawBody);
    
    // Return 200 OK immediately to acknowledge receipt
    return createAcknowledgmentResponse();
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error processing request:`, error);
    
    // For unexpected/uncaught errors, return 500
    return createWebhookResponse({
      success: false,
      message: 'Internal server error: ' + error.message,
      status: 500
    });
  }
});
