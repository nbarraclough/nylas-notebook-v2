import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Use production API server
const NYLAS_API_SERVER = "https://api.us.nylas.com";
const WEBHOOK_SECRET = Deno.env.get('NYLAS_PROD_WEBHOOK_SECRET');

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Check for challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');

    // If there's a challenge parameter, respond immediately with just the challenge value
    if (challenge) {
      console.log(`🔐 [${requestId}] Received Nylas challenge:`, challenge);
      return new Response(challenge, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }

    // For non-challenge requests, proceed with webhook handling
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Method not allowed",
        }),
        { 
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get the raw request body as text
    const rawBody = await req.text();
    console.log(`📥 [${requestId}] Raw webhook body:`, rawBody);

    try {
      // Parse webhook data
      const webhookData = JSON.parse(rawBody);
      console.log(`📥 [${requestId}] Webhook data:`, JSON.stringify(webhookData, null, 2));

      // Log webhook metadata
      console.log(`📝 [${requestId}] Webhook type:`, webhookData.type);
      console.log(`📝 [${requestId}] Webhook timestamp:`, new Date(webhookData.time * 1000).toISOString());
      
      // For non-challenge requests, just acknowledge receipt
      const endTime = performance.now();
      console.log(`✅ [${requestId}] Webhook processed successfully in ${(endTime - startTime).toFixed(2)}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully received ${webhookData.type} webhook`,
          requestId,
          status: 'acknowledged'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (parseError) {
      console.error(`❌ [${requestId}] Error parsing webhook JSON:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON payload',
          details: parseError.message
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ [${requestId}] Webhook error after ${(endTime - startTime).toFixed(2)}ms:`, {
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        status: 'acknowledged'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});