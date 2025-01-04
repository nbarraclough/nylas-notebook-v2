import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders, verifyNylasWebhook } from '../_shared/nylas-auth.ts'
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantStatus 
} from '../_shared/webhook-handlers.ts'

interface WebhookEvent {
  delta: {
    date: number;
    object: string;
    type: string;
    object_data?: Record<string, any>;
    previous?: Record<string, any>;
    grant_id?: string;
  };
  triggers: string[];
}

Deno.serve(async (req) => {
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
    
    if (!verifyNylasWebhook(req, rawBody)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the webhook event
    const webhookEvent: WebhookEvent = JSON.parse(rawBody);
    console.log('Processing webhook event:', webhookEvent);

    const { delta } = webhookEvent;
    const grantId = delta.grant_id;

    // If we have a grant_id, check if we have a matching profile
    if (grantId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('nylas_grant_id', grantId)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
        throw profileError;
      }

      if (!profile) {
        console.log(`No profile found for grant_id: ${grantId}. Skipping webhook processing.`);
        return new Response(
          JSON.stringify({ message: 'No matching profile found for grant_id' }), 
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

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