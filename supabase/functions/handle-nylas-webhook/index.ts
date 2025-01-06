import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { 
  logWebhookRequest, 
  logRawBody, 
  logParsedWebhook, 
  logWebhookError,
  logWebhookSuccess
} from '../_shared/webhook-logger.ts'
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
  console.log(`⚡ [${requestId}] Webhook handler started`);
  
  // Log request details
  logWebhookRequest(req);

  try {
    // Handle challenge parameter (for both GET and POST)
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log(`🎯 [${requestId}] Challenge received: ${challenge}`);
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only process webhooks for POST requests
    if (req.method === 'POST') {
      const rawBody = await req.text();
      logRawBody(rawBody);

      // Verify webhook signature
      const signature = req.headers.get('x-nylas-signature');
      const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        logWebhookError('configuration', new Error('NYLAS_WEBHOOK_SECRET not configured'));
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Webhook secret not configured',
            status: 'acknowledged'
          }),
          { 
            status: 200, // Always return 200 even for configuration errors
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const isValid = await verifyWebhookSignature(rawBody, signature || '', webhookSecret);
      if (!isValid) {
        logWebhookError('signature verification', new Error('Invalid webhook signature'));
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid signature',
            status: 'acknowledged'
          }),
          { 
            status: 200, // Always return 200 even for invalid signatures
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Parse and process webhook
      const webhookData = JSON.parse(rawBody);
      logParsedWebhook(webhookData);

      // Get grant ID from webhook data
      const grantId = webhookData.data?.object?.grant_id;
      if (!grantId) {
        logWebhookError('data validation', new Error('No grant ID found in webhook data'));
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No grant ID found in webhook data',
            status: 'acknowledged'
          }),
          { 
            status: 200, // Always return 200 even when grant ID is missing
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      try {
        // Handle different webhook types
        switch (webhookData.type) {
          case 'event.created':
            const createResult = await handleEventCreated(webhookData.data.object, grantId);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(createResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          case 'event.updated':
            const updateResult = await handleEventUpdated(webhookData.data.object, grantId);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(updateResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          case 'event.deleted':
            const deleteResult = await handleEventDeleted(webhookData.data.object, grantId);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(deleteResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          // Handle grant webhooks
          case 'grant.created':
            const grantCreateResult = await handleGrantCreated(webhookData.data);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(grantCreateResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          case 'grant.updated':
            const grantUpdateResult = await handleGrantUpdated(webhookData.data);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(grantUpdateResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          case 'grant.deleted':
            const grantDeleteResult = await handleGrantDeleted(webhookData.data);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(grantDeleteResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          case 'grant.expired':
            const grantExpireResult = await handleGrantExpired(webhookData.data);
            logWebhookSuccess(webhookData.type);
            return new Response(JSON.stringify(grantExpireResult), { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          // Handle notetaker webhooks
          default:
            if (webhookData.type.startsWith('notetaker.')) {
              console.log(`📝 [${requestId}] Processing ${webhookData.type} webhook`);
              logWebhookSuccess(webhookData.type);
              
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
            }

            // Unhandled webhook type
            console.log(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
            return new Response(
              JSON.stringify({
                success: false,
                message: `Unhandled webhook type: ${webhookData.type}`,
                status: 'acknowledged'
              }),
              { 
                status: 200, // Always return 200 even for unhandled webhook types
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
        }
      } catch (processingError) {
        // Log the error but still return 200
        logWebhookError('webhook processing', processingError);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error processing webhook: ${processingError.message}`,
            status: 'acknowledged'
          }),
          { 
            status: 200, // Always return 200 even when processing fails
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Invalid method
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed',
        status: 'acknowledged'
      }),
      { 
        status: 200, // Always return 200 even for invalid methods
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logWebhookError('webhook processing', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        status: 'error'
      }),
      { 
        status: 200, // Always return 200 even for unexpected errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})