import { serve } from "https://deno.fresh.run/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyWebhook } from "../_shared/webhook-verification.ts";
import { logWebhook } from "../_shared/webhook-logger.ts";
import { handleEvent, handleGrant } from "../_shared/webhook-handlers.ts";

const NYLAS_API_SERVER = "https://api.us.nylas.com";

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

    if (rawBody) {
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

      // Verify webhook signature
      const signature = req.headers.get("x-nylas-signature");
      if (!signature) {
        throw new Error("Missing Nylas signature");
      }

      const isValid = await verifyWebhook(
        NYLAS_API_SERVER,
        signature,
        rawBody
      );

      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }

      // Log webhook
      await logWebhook(requestId, webhookData);

      // Handle webhook based on type
      switch (webhookData.type) {
        case "event":
          await handleEvent(webhookData.data);
          break;
        case "grant":
          await handleGrant(webhookData.data);
          break;
        default:
          console.log(`⚠️ [${requestId}] Unhandled webhook type:`, webhookData.type);
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
    }

    throw new Error("Empty webhook body");

  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, error);

    // Don't expose internal errors
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