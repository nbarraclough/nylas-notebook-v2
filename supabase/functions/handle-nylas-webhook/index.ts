import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, verifyNylasWebhook } from "../_shared/nylas-auth.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received webhook request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Verify the request and check for challenge
    const { isValid, challenge } = await verifyNylasWebhook(req);
    
    if (!isValid) {
      console.error('Invalid webhook request');
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle challenge request - must return ONLY the challenge string
    if (challenge) {
      console.log('Responding to challenge request with:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        }
      });
    }

    // For non-challenge requests, parse the webhook payload
    const rawBody = await req.text();
    console.log('Webhook payload:', rawBody);

    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
      console.log('Parsed webhook data:', webhookData);
    } catch (error) {
      console.error('Error parsing webhook data:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client for database operations
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

    // Process webhook based on type
    const webhookType = webhookData.type;
    console.log('Processing webhook type:', webhookType);

    // Handle different webhook types
    switch (webhookType) {
      case 'grant.created':
      case 'grant.deleted':
      case 'grant.expired':
        // Update grant status in profiles table
        const grantId = webhookData.grant_id;
        const status = webhookType === 'grant.created' ? 'active' : 'revoked';
        
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            grant_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('nylas_grant_id', grantId);

        if (updateError) {
          console.error('Error updating grant status:', updateError);
          throw updateError;
        }
        break;

      default:
        console.log('Unhandled webhook type:', webhookType);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})