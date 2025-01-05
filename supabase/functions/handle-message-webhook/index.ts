import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { logWebhookRequest, logWebhookBody, logSignatureVerification } from '../_shared/webhook-logger.ts'
import { handleMessageOpened, handleMessageLinkClicked } from '../_shared/handlers/message-handlers.ts'
import type { MessageOpenedWebhook, MessageLinkClickedWebhook } from '../../../src/integrations/supabase/types/webhook-types/message.ts'

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`⚡ [${timestamp}] Message webhook handler started`);
  
  try {
    // Log every incoming request with headers
    logWebhookRequest(req);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('🔄 Processing CORS preflight request');
      return new Response(null, { headers: corsHeaders });
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
    console.log(`🎯 [${timestamp}] Processing message webhook:`, {
      type: webhookData.type,
      data: webhookData.data
    });

    let processingResult;
    try {
      switch (webhookData.type) {
        case 'message.opened':
          console.log('📨 Processing message.opened webhook:', webhookData.data);
          processingResult = await handleMessageOpened(webhookData as MessageOpenedWebhook);
          break;
        case 'message.link_clicked':
          console.log('🔗 Processing message.link_clicked webhook:', webhookData.data);
          processingResult = await handleMessageLinkClicked(webhookData as MessageLinkClickedWebhook);
          break;
        default:
          console.log('⚠️ Unhandled message webhook type:', webhookData.type);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Unhandled message webhook type: ${webhookData.type}`,
              status: 'acknowledged'
            }), 
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }

      console.log(`✅ [${timestamp}] Successfully processed message webhook:`, {
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
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error(`❌ [${timestamp}] Error processing ${webhookData.type} webhook:`, {
        error: error.message,
        stack: error.stack,
        data: webhookData.data
      });
      
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
    console.error(`❌ [${timestamp}] Fatal error in message webhook handler:`, {
      error: error.message,
      stack: error.stack
    });
    
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