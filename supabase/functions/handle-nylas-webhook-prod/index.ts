import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use production API server
const NYLAS_API_SERVER = "https://api.us.nylas.com";
const WEBHOOK_SECRET = Deno.env.get('NYLAS_PROD_WEBHOOK_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nylas-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Handle GET request with challenge parameter
    if (req.method === "GET") {
      const url = new URL(req.url);
      const challenge = url.searchParams.get('challenge');
      
      if (challenge) {
        console.log(`🔐 [${requestId}] Received Nylas challenge:`, challenge);
        return new Response(challenge, {
          headers: {
            'Content-Type': 'text/plain',
            ...corsHeaders,
          }
        });
      }
    }

    // Handle POST requests for webhook data
    if (req.method === "POST") {
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
    }

    // If neither GET with challenge nor POST, return method not allowed
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
        status: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});