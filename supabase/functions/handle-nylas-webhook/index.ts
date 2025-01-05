import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { logWebhookRequest, logWebhookBody } from '../_shared/webhook-logger.ts'
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantCreated,
  handleGrantUpdated,
  handleGrantDeleted,
  handleGrantExpired
} from '../_shared/webhook-handlers.ts'
import { validateWebhook } from './webhook-validator.ts'
import { createWebhookResponse } from './response-handler.ts'

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

    // Validate webhook signature and get body
    const { rawBody, isValid } = await validateWebhook(req);
    
    // Parse and log webhook data
    const webhookData = logWebhookBody(rawBody);
    if (!webhookData) {
      console.error('❌ Invalid webhook data');
      throw new Error('Invalid webhook data');
    }

    // Process webhook based on type
    const grantId = webhookData.data.object.grant_id;
    console.log(`🎯 [${timestamp}] Processing webhook:`, {
      type: webhookData.type,
      grantId,
      objectData: webhookData.data.object
    });

    let processingResult;
    try {
      switch (webhookData.type) {
        case 'event.created':
          console.log('📅 Processing event.created webhook:', webhookData.data.object);
          processingResult = await handleEventCreated(webhookData.data.object, grantId);
          break;
        case 'event.updated':
          console.log('🔄 Processing event.updated webhook:', webhookData.data.object);
          processingResult = await handleEventUpdated(webhookData.data.object, grantId);
          break;
        case 'event.deleted':
          console.log('🗑️ Processing event.deleted webhook:', webhookData.data.object);
          processingResult = await handleEventDeleted(webhookData.data.object, grantId);
          break;
        case 'grant.created':
          console.log('🔑 Processing grant.created webhook:', webhookData.data);
          processingResult = await handleGrantCreated(webhookData.data);
          break;
        case 'grant.updated':
          console.log('🔄 Processing grant.updated webhook:', webhookData.data);
          processingResult = await handleGrantUpdated(webhookData.data);
          break;
        case 'grant.deleted':
          console.log('🗑️ Processing grant.deleted webhook:', webhookData.data);
          processingResult = await handleGrantDeleted(webhookData.data);
          break;
        case 'grant.expired':
          console.log('⚠️ Processing grant.expired webhook:', webhookData.data);
          processingResult = await handleGrantExpired(webhookData.data);
          break;
        default:
          console.log('⚠️ Unhandled webhook type:', webhookData.type);
          return createWebhookResponse(
            false,
            `Unhandled webhook type: ${webhookData.type}`,
            null,
            400
          );
      }

      console.log(`✅ [${timestamp}] Successfully processed webhook:`, {
        type: webhookData.type,
        result: processingResult
      });
      
      return createWebhookResponse(
        true,
        `Successfully processed ${webhookData.type} webhook`,
        processingResult
      );

    } catch (error) {
      // Log the specific error from webhook processing
      console.error(`❌ [${timestamp}] Error processing ${webhookData.type} webhook:`, {
        error: error.message,
        stack: error.stack,
        data: webhookData.data,
        grantId
      });
      
      return createWebhookResponse(
        false,
        `Error processing ${webhookData.type} webhook: ${error.message}`,
        null
      );
    }

  } catch (error) {
    // Log validation/setup errors
    console.error(`❌ [${timestamp}] Webhook validation error:`, {
      error: error.message,
      stack: error.stack,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    return createWebhookResponse(
      false,
      error.message,
      null
    );
  }
})