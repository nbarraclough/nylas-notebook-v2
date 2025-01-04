import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        console.log('Parsed webhook data:', {
          type: webhookData.type,
          trigger: webhookData.trigger,
          delta: webhookData.delta,
          grant_id: webhookData.grant_id,
          object_data: webhookData.object_data
        });
      } catch (error) {
        console.error('Error parsing webhook body:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Always return a success response for now
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