import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, mux-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const verifyMuxSignature = async (rawBody: string, signature: string | null, secret: string) => {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === calculatedSignature;
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`⚡ [${requestId}] Mux webhook handler started`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook secret
    const webhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error(`❌ [${requestId}] MUX_WEBHOOK_SECRET not configured`);
      throw new Error('Webhook secret not configured');
    }

    // Get and verify signature
    const signature = req.headers.get('mux-signature');
    const rawBody = await req.text();
    console.log(`📦 [${requestId}] Raw webhook body:`, rawBody);

    const isValid = await verifyMuxSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error(`❌ [${requestId}] Invalid webhook signature`);
      throw new Error('Invalid signature');
    }

    // Parse webhook data
    const webhookData = JSON.parse(rawBody);
    console.log(`🔍 [${requestId}] Parsed webhook data:`, webhookData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different webhook types
    switch (webhookData.type) {
      case 'video.asset.ready': {
        const { playback_ids, id: assetId } = webhookData.data;
        const playbackId = playback_ids?.[0]?.id;

        if (playbackId) {
          const { error } = await supabase
            .from('recordings')
            .update({
              status: 'completed',
              mux_asset_id: assetId,
              mux_playback_id: playbackId,
              updated_at: new Date().toISOString()
            })
            .eq('mux_asset_id', assetId);

          if (error) throw error;
          console.log(`✅ [${requestId}] Updated recording with playback ID:`, playbackId);
        }
        break;
      }

      case 'video.asset.errored': {
        const { id: assetId, error: muxError } = webhookData.data;
        const { error } = await supabase
          .from('recordings')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('mux_asset_id', assetId);

        if (error) throw error;
        console.log(`❌ [${requestId}] Updated recording status to failed. Mux error:`, muxError);
        break;
      }

      case 'video.asset.deleted': {
        const { id: assetId } = webhookData.data;
        const { error } = await supabase
          .from('recordings')
          .update({
            status: 'deleted',
            updated_at: new Date().toISOString()
          })
          .eq('mux_asset_id', assetId);

        if (error) throw error;
        console.log(`🗑️ [${requestId}] Marked recording as deleted`);
        break;
      }

      default:
        console.log(`⚠️ [${requestId}] Unhandled webhook type:`, webhookData.type);
    }

    return new Response(
      JSON.stringify({ success: true }),
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
        error: error.message 
      }),
      { 
        status: 200, // Always return 200 to acknowledge webhook
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});