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

    // Check for challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('Received challenge request:', challenge);
      return new Response(
        JSON.stringify({ challenge }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // For non-challenge requests, proceed with signature verification
    const rawBody = await req.text();
    console.log('Received webhook payload:', rawBody.slice(0, 100) + '...'); // Log first 100 chars

    // Log the client secret being used (first few characters only for security)
    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    console.log('Using client secret (first 4 chars):', clientSecret?.slice(0, 4));

    // Verify the webhook signature
    const isValid = await verifyNylasWebhook(req, rawBody);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid signature',
          message: 'The webhook signature verification failed'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the body as JSON after verification
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
      console.log('Webhook data:', webhookData);
    } catch (error) {
      console.error('Error parsing webhook data:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON',
          message: 'Failed to parse webhook payload as JSON'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
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

    // Process the webhook based on its type
    console.log('Processing webhook:', webhookData.type);

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