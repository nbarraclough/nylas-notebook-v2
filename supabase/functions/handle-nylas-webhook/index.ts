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
import { 
  logWebhookRequest, 
  logRawBody,
  logParsedWebhook,
  logWebhookError,
  logWebhookSuccess
} from '../_shared/webhook-logger.ts'

serve(async (req) => {
  // Log initial request
  logWebhookRequest(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders
    });
  }

  // Handle GET requests (webhook verification)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('🎯 Challenge verification request received:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/plain'
        }
      });
    }

    return new Response('Missing challenge parameter', { 
      status: 400,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain'
      }
    });
  }

  // Handle POST requests (webhook events)
  if (req.method === 'POST') {
    try {
      const rawBody = await req.text();
      logRawBody(rawBody);

      // Validate webhook signature
      const signature = req.headers.get('x-nylas-signature');
      const { isValid } = await validateWebhook(rawBody, signature);
      
      if (!isValid) {
        logWebhookError('signature validation', new Error('Invalid signature'));
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid signature' }),
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
        logParsedWebhook(webhookData);
      } catch (error) {
        logWebhookError('JSON parsing', error);
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

        logWebhookSuccess(webhookData.type);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully processed ${webhookData.type} webhook`,
            result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        logWebhookError('webhook processing', error);
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (error) {
      logWebhookError('request handling', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Internal server error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Handle unsupported methods
  return new Response(
    JSON.stringify({
      success: false,
      message: `Method ${req.method} not allowed`
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
})