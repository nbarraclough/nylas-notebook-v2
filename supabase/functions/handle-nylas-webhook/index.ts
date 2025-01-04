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
  // First, check for the challenge parameter before anything else
  const url = new URL(req.url);
  const challenge = url.searchParams.get('challenge');
  
  if (challenge) {
    console.log('Received Nylas webhook challenge:', challenge);
    // Return ONLY the raw challenge value without any formatting or additional content
    return new Response(challenge, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'identity', // Prevent chunked encoding
        'Content-Length': challenge.length.toString(), // Explicitly set content length
      },
    });
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // For non-challenge requests, verify the webhook signature
    const clonedReq = req.clone();
    const rawBody = await clonedReq.text();
    console.log('Received webhook payload:', rawBody);
    
    if (!verifyNylasWebhook(req, rawBody)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Parse the webhook event
    const webhookEvent: WebhookEvent = JSON.parse(rawBody);
    console.log('Received webhook event:', webhookEvent);

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

      // If we don't have a matching profile, log and return early
      if (!profile) {
        console.log(`No profile found for grant_id: ${grantId}. Skipping webhook processing.`);
        return new Response(
          JSON.stringify({ message: 'No matching profile found for grant_id' }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});