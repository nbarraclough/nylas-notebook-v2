import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mux-signature',
};

const verifyMuxSignature = async (
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> => {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // The signature from Mux is in the format: t=timestamp,v=signature
    const [, signatureValue] = signature.split('v=');
    if (!signatureValue) {
      console.error('Invalid signature format');
      return false;
    }

    const signatureBytes = new Uint8Array(
      signatureValue.split('').map((c) => c.charCodeAt(0))
    );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("MUX_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("MUX_WEBHOOK_SECRET is not set");
    }

    // Get the signature from the headers
    const signature = req.headers.get("mux-signature");
    if (!signature) {
      console.error('No Mux signature found in request headers');
      throw new Error("No signature found in request headers");
    }

    // Get the raw body
    const body = await req.text();
    console.log('Received Mux webhook payload:', body);

    // Verify the signature
    const isValid = await verifyMuxSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Mux signature');
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
        console.log('Video asset ready:', { assetId, playbackId });

        if (playbackId) {
          const { error } = await supabase
            .from("recordings")
            .update({
              status: "ready",
              mux_playback_id: playbackId,
              updated_at: new Date().toISOString(),
            })
            .eq("mux_asset_id", assetId);

          if (error) {
            console.error('Error updating recording:', error);
            throw error;
          }
          
          console.log('Successfully updated recording status to ready');
        }
        break;
      }

      case "video.asset.errored": {
        const { id: assetId, error: muxError } = data;
        console.log('Video asset error:', { assetId, error: muxError });

        const { error } = await supabase
          .from("recordings")
          .update({
            status: "error",
            updated_at: new Date().toISOString(),
          })
          .eq("mux_asset_id", assetId);

        if (error) {
          console.error('Error updating recording status:', error);
          throw error;
        }
        
        console.log('Successfully updated recording status to error');
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