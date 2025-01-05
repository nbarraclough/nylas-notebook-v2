import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// Log function initialization
console.log('🚀 Production webhook handler initialized:', new Date().toISOString());

serve(async (req) => {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  
  // Enhanced request logging
  console.log(`\n=== New Production Webhook Request ${requestId} ===`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 Method: ${req.method}`);
  console.log(`🔗 URL: ${req.url}`);
  
  // Detailed headers logging
  const headers = Object.fromEntries(req.headers.entries());
  console.log('📋 Headers:', JSON.stringify(headers, null, 2));

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`✈️ [${requestId}] CORS preflight request`);
      return new Response(null, { 
        headers: corsHeaders
      });
    }

    // Get and log raw body
    const rawBody = await req.text();
    console.log(`📦 [${requestId}] Raw body length: ${rawBody.length}`);
    console.log(`📦 [${requestId}] Raw body:`, rawBody);

    try {
      // Parse webhook data
      const webhookData = JSON.parse(rawBody);
      console.log(`📥 [${requestId}] Webhook data:`, JSON.stringify(webhookData, null, 2));

      // Handle Nylas webhook challenge - make sure to return exactly what Nylas expects
      if (webhookData.type === 'challenge') {
        console.log(`🔐 [${requestId}] Handling Nylas webhook challenge:`, webhookData.challenge);
        return new Response(
          JSON.stringify({ challenge: webhookData.challenge }),
          { 
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json'
            }
          }
        );
      }

      const endTime = performance.now();
      console.log(`✅ [${requestId}] Webhook processed successfully in ${(endTime - startTime).toFixed(2)}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully processed ${webhookData.type} webhook`,
          status: 'acknowledged'
        }),
        { 
          status: 200,
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
        status: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})