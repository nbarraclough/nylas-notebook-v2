import { corsHeaders, verifyNylasWebhook } from '../_shared/nylas-auth.ts'
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantStatus 
} from '../_shared/webhook-handlers.ts'

Deno.serve(async (req) => {
  // Log incoming request details
  console.log('Received webhook request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // First, check for the challenge parameter
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('Received Nylas challenge:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
          'Content-Length': challenge.length.toString(),
        },
      });
    }

    // For non-challenge requests, get the raw body
    const rawBody = await req.text();
    console.log('Received webhook payload:', rawBody);

    // Skip signature verification for now as we're debugging
    const webhookEvent = JSON.parse(rawBody);
    console.log('Processing webhook event:', webhookEvent);

    const { delta } = webhookEvent;
    const grantId = delta.grant_id;

    // Handle different webhook events
    switch (delta.type) {
      case 'event.created':
        if (delta.object_data && grantId) {
          await handleEventCreated(delta.object_data, grantId);
        }
        break;

      case 'event.updated':
        if (delta.object_data && grantId) {
          await handleEventUpdated(delta.object_data, grantId);
        }
        break;

      case 'event.deleted':
        if (delta.object_data) {
          await handleEventDeleted(delta.object_data);
        }
        break;

      case 'grant.created':
      case 'grant.updated':
        if (grantId) {
          await handleGrantStatus(grantId, 'active');
        }
        break;

      case 'grant.deleted':
        if (grantId) {
          await handleGrantStatus(grantId, 'revoked');
        }
        break;

      case 'grant.expired':
        if (grantId) {
          await handleGrantStatus(grantId, 'error');
        }
        break;

      default:
        console.log('Unhandled webhook type:', delta.type);
    }

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
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});