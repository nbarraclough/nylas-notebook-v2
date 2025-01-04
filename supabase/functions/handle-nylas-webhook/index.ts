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
    // Log ALL incoming requests for debugging
    console.log('🔔 NEW WEBHOOK REQUEST RECEIVED');
    console.log('📝 Request details:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Handle challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('🎯 Challenge request received:', challenge);
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
      console.error('❌ NYLAS_WEBHOOK_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    // Get the signature from headers
    const signature = req.headers.get('x-nylas-signature');
    if (!signature) {
      console.error('❌ No signature in webhook request');
      throw new Error('No signature provided');
    }

    // Get and log the raw request body
    const rawBody = await req.text();
    console.log('📥 Raw webhook body:', rawBody);

    // Parse JSON if we have a body
    if (rawBody) {
      try {
        const webhookData = JSON.parse(rawBody);
        console.log('🔍 Webhook data:', JSON.stringify(webhookData, null, 2));

        // Handle different webhook types
        switch (webhookData.type) {
          case 'event.created':
            console.log('📅 Processing event.created webhook');
            await handleEventCreated(webhookData.data.object, webhookData.data.object.grant_id);
            break;
          case 'event.updated':
            console.log('📅 Processing event.updated webhook');
            await handleEventUpdated(webhookData.data.object, webhookData.data.object.grant_id);
            break;
          case 'event.deleted':
            console.log('📅 Processing event.deleted webhook');
            await handleEventDeleted(webhookData.data.object);
            break;
          case 'grant.created':
            console.log('🔑 Processing grant.created webhook');
            await handleGrantCreated(webhookData.data);
            break;
          case 'grant.updated':
            console.log('🔑 Processing grant.updated webhook');
            await handleGrantUpdated(webhookData.data);
            break;
          case 'grant.deleted':
            console.log('🔑 Processing grant.deleted webhook');
            await handleGrantDeleted(webhookData.data);
            break;
          case 'grant.expired':
            console.log('🔑 Processing grant.expired webhook');
            await handleGrantExpired(webhookData.data);
            break;
          default:
            console.log('⚠️ Unhandled webhook type:', webhookData.type);
        }

        console.log('✅ Successfully processed webhook:', webhookData.type);

      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        console.error('Error details:', error.stack);
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
    console.error('❌ Fatal error processing webhook:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})