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

// Function to verify webhook signature
const verifyWebhookSignature = async (body: string, signature: string, secret: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const actualSignature = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToUint8Array(signature),
    encoder.encode(body)
  );

  return actualSignature;
};

// Helper function to convert hex string to Uint8Array
const hexToUint8Array = (hexString: string) => {
  const pairs = hexString.match(/[\dA-F]{2}/gi) || [];
  return new Uint8Array(
    pairs.map(s => parseInt(s, 16))
  );
};

serve(async (req) => {
  // Log every incoming request
  console.log('🔔 Webhook received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔄 Processing CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get the webhook secret
    const webhookSecret = Deno.env.get('NYLAS_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ NYLAS_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { 
          status: 200, // Still return 200 to acknowledge receipt
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the signature (try both cases)
    const signature = req.headers.get('x-nylas-signature') || req.headers.get('X-Nylas-Signature');
    if (!signature) {
      console.error('❌ No signature in webhook request');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { 
          status: 200, // Still return 200 to acknowledge receipt
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get and log the raw request body
    const rawBody = await req.text();
    console.log('📥 Raw webhook body:', rawBody);

    // Verify signature
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    console.log('🔐 Signature verification:', isValid ? 'valid' : 'invalid');

    // Parse JSON if we have a body
    if (rawBody) {
      try {
        const webhookData = JSON.parse(rawBody);
        console.log('📦 Parsed webhook data:', JSON.stringify(webhookData, null, 2));

        // Log webhook type
        console.log('📋 Webhook type:', webhookData.type);

        // Always return 200 to acknowledge receipt
        return new Response(
          JSON.stringify({ success: true }), 
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

      } catch (error) {
        console.error('❌ Error parsing webhook JSON:', error);
        // Still return 200 to acknowledge receipt
        return new Response(
          JSON.stringify({ error: 'Error parsing webhook', details: error.message }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Return success for empty body
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
    // Still return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})