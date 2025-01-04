import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Log request details for debugging
    console.log('Webhook Request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Handle challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('Challenge request received:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        }
      });
    }

    // Get the webhook secret from environment
    const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('NYLAS_WEBHOOK_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    // Get the signature from headers
    const signature = req.headers.get('x-nylas-signature');
    if (!signature) {
      console.error('No signature in webhook request');
      throw new Error('No signature provided');
    }

    // Get the raw request body
    const rawBody = await req.text();
    console.log('Raw webhook body:', rawBody);

    // Verify webhook signature
    // Note: In a production environment, you should implement proper signature verification
    // using the webhookSecret and signature
    console.log('Webhook signature:', signature);
    console.log('Using webhook secret:', webhookSecret.substring(0, 4) + '...');

    // Parse JSON if we have a body
    if (rawBody) {
      try {
        const webhookData = JSON.parse(rawBody);
        console.log('Processing webhook:', {
          type: webhookData.type,
          source: webhookData.source,
          time: new Date(webhookData.time * 1000).toISOString(),
          data: {
            application_id: webhookData.data?.application_id,
            object: {
              grant_id: webhookData.data?.object?.grant_id,
              id: webhookData.data?.object?.id,
              calendar_id: webhookData.data?.object?.calendar_id
            }
          }
        });

        // Handle different webhook types
        switch (webhookData.type) {
          case 'event.created':
            await handleEventCreated(webhookData.data.object, webhookData.data.grant_id);
            break;
          case 'event.updated':
            await handleEventUpdated(webhookData.data.object, webhookData.data.grant_id);
            break;
          case 'event.deleted':
            await handleEventDeleted(webhookData.data.object);
            break;
          case 'grant.created':
            await handleGrantCreated(webhookData.data);
            break;
          case 'grant.updated':
            await handleGrantUpdated(webhookData.data);
            break;
          case 'grant.deleted':
            await handleGrantDeleted(webhookData.data);
            break;
          case 'grant.expired':
            await handleGrantExpired(webhookData.data);
            break;
          default:
            console.log('Unhandled webhook type:', webhookData.type);
        }

      } catch (error) {
        console.error('Error processing webhook:', error);
        return new Response(
          JSON.stringify({ error: 'Error processing webhook', details: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})