
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { logWebhookRequest, logRawBody, logWebhookError, logWebhookSuccess } from "../_shared/webhook-logger.ts";

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
    console.log('Verifying Mux signature:', {
      signatureHeader: signature,
      payloadLength: payload.length
    });

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Parse the signature header which is in format t=timestamp,v=signature
    const [timestampPart, signaturePart] = signature.split(',');
    if (!timestampPart || !signaturePart) {
      console.error('Invalid signature format:', signature);
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const providedSignature = signaturePart.split('=')[1];
    
    if (!timestamp || !providedSignature) {
      console.error('Missing timestamp or signature parts:', { timestamp, providedSignature });
      return false;
    }

    // Check if timestamp is within tolerance (5 minutes)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (Math.abs(now - timestampMs) > fiveMinutes) {
      console.error('Timestamp outside tolerance window:', {
        webhookTimestamp: new Date(timestampMs).toISOString(),
        currentTime: new Date(now).toISOString(),
        differenceMs: Math.abs(now - timestampMs)
      });
      return false;
    }

    // Convert hex signature to Uint8Array
    const signatureBytes = new Uint8Array(
      providedSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Create the message to verify (timestamp + . + payload)
    const message = `${timestamp}.${payload}`;
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(message)
    );

    console.log('Signature verification result:', {
      isValid,
      messageLength: message.length,
      signatureBytesLength: signatureBytes.length
    });

    return isValid;
  } catch (error) {
    console.error('Error in signature verification:', {
      error: error.message,
      stack: error.stack,
      signature
    });
    return false;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log incoming request
    logWebhookRequest(req);
    
    const requestId = crypto.randomUUID();
    console.log(`Processing Mux webhook request: ${requestId}`);

    const webhookSecret = Deno.env.get("MUX_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("MUX_WEBHOOK_SECRET is not set");
    }

    // Get the signature from the headers
    const signature = req.headers.get("mux-signature");
    if (!signature) {
      console.error('No Mux signature found in request headers:', 
        Object.fromEntries(req.headers.entries())
      );
      throw new Error("No signature found in request headers");
    }

    // Get the raw body
    const body = await req.text();
    logRawBody(body);

    // Verify the signature
    const isValid = await verifyMuxSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Mux signature:', {
        signature,
        bodyPreview: body.substring(0, 100)
      });
      throw new Error("Invalid signature");
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);
    const { type, data } = payload;
    console.log("Received Mux webhook:", { type, assetId: data?.id });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    switch (type) {
      case "video.asset.created": {
        const { id: assetId } = data;
        console.log('Video asset created:', { assetId });

        const { error } = await supabase
          .from("recordings")
          .update({
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("mux_asset_id", assetId);

        if (error) {
          console.error('Error updating recording:', error);
          throw error;
        }
        
        logWebhookSuccess('video.asset.created');
        break;
      }

      case "video.asset.ready": {
        const { playback_ids, id: assetId } = data;
        const playbackId = playback_ids?.[0]?.id;
        console.log('Video asset ready:', { assetId, playbackId });

        if (playbackId) {
          // Get recording and user details
          const { data: recording, error: recordingError } = await supabase
            .from("recordings")
            .select(`
              id,
              user_id,
              event_id,
              profiles:user_id (
                nylas_grant_id,
                email,
                first_name,
                last_name
              ),
              events (
                title
              )
            `)
            .eq("mux_asset_id", assetId)
            .single();

          if (recordingError) {
            console.error('Error fetching recording details:', recordingError);
            throw recordingError;
          }

          // Update recording status
          const { error: updateError } = await supabase
            .from("recordings")
            .update({
              status: "ready",
              mux_playback_id: playbackId,
              updated_at: new Date().toISOString(),
            })
            .eq("mux_asset_id", assetId);

          if (updateError) {
            console.error('Error updating recording:', updateError);
            throw updateError;
          }

          // Send email notification
          console.log('📧 Triggering recording ready email notification');
          const { error: emailError } = await supabase.functions.invoke('send-recording-ready-email', {
            body: {
              recordingId: recording.id,
              userId: recording.user_id,
              grantId: recording.profiles.nylas_grant_id
            }
          });

          if (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't throw here, as we've already updated the recording status
          }
          
          logWebhookSuccess('video.asset.ready');
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
        
        logWebhookSuccess('video.asset.errored');
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
    logWebhookError('Mux webhook processing', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
