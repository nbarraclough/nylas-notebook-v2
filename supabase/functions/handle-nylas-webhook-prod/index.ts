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

    // Only allow POST requests
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

    // Get the raw request body
    const rawBody = await req.text();
    console.log(`📥 [${requestId}] Raw webhook body:`, rawBody);

    // Parse webhook data
    const webhookData = JSON.parse(rawBody);
    console.log(`📥 [${requestId}] Webhook data:`, JSON.stringify(webhookData, null, 2));

    // Handle Nylas webhook challenge
    if (webhookData.type === 'challenge') {
      console.log(`🔐 [${requestId}] Handling Nylas webhook challenge:`, webhookData.challenge);
      return new Response(
        webhookData.challenge,
        { 
          status: 200,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        }
      );
    }

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
        requestId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        requestId
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});