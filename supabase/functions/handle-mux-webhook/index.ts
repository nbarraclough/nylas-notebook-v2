import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

const verifyMuxSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const message = encoder.encode(payload);

  const cryptoKey = crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = new Uint8Array(
    signature.split(",")[1].split("").map((c) => c.charCodeAt(0))
  );

  return crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureBytes,
    message
  );
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("MUX_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("MUX_WEBHOOK_SECRET is not set");
    }

    // Get the signature from the headers
    const signature = req.headers.get("mux-signature");
    if (!signature) {
      throw new Error("No signature found in request headers");
    }

    // Get the raw body
    const body = await req.text();

    // Verify the signature
    const isValid = await verifyMuxSignature(body, signature, webhookSecret);
    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);
    const { type, data } = payload;
    console.log("Received Mux webhook:", type);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    switch (type) {
      case "video.asset.ready": {
        const { playback_ids, id: assetId } = data;
        const playbackId = playback_ids?.[0]?.id;

        if (playbackId) {
          const { error } = await supabase
            .from("recordings")
            .update({
              status: "ready",
              mux_playback_id: playbackId,
              updated_at: new Date().toISOString(),
            })
            .eq("mux_asset_id", assetId);

          if (error) throw error;
        }
        break;
      }

      case "video.asset.errored": {
        const { id: assetId } = data;
        const { error } = await supabase
          .from("recordings")
          .update({
            status: "error",
            updated_at: new Date().toISOString(),
          })
          .eq("mux_asset_id", assetId);

        if (error) throw error;
        break;
      }

      case "video.asset.deleted": {
        const { id: assetId } = data;
        const { error } = await supabase
          .from("recordings")
          .update({
            status: "deleted",
            updated_at: new Date().toISOString(),
          })
          .eq("mux_asset_id", assetId);

        if (error) throw error;
        break;
      }

      default:
        console.log("Unhandled event type:", type);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});