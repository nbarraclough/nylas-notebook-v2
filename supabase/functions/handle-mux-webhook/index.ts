
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Generate a unique request ID for tracing
  const requestId = crypto.randomUUID();
  
  // Log basic request information
  console.log(`📥 [${requestId}] Received ${req.method} request to Mux webhook handler`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log(`📝 [${requestId}] Received Mux webhook payload of length: ${body.length}`);
    
    // Parse webhook data
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse webhook body:`, parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`📝 [${requestId}] Mux webhook type: ${webhookData.type || 'UNKNOWN'}`);
    
    // Log details for debugging
    console.log(`📝 [${requestId}] Mux webhook details:`, JSON.stringify({
      type: webhookData.type,
      object_id: webhookData.object?.id,
      environment: webhookData.environment
    }));

    // Process different webhook types
    switch (webhookData.type) {
      case 'video.asset.ready':
        return await handleAssetReady(webhookData, requestId);
      
      case 'video.asset.errored':
        return await handleAssetError(webhookData, requestId);
        
      case 'video.asset.static_renditions.ready':
        return await handleRenditionsReady(webhookData, requestId);
        
      default:
        console.log(`⚠️ [${requestId}] Unhandled event type: ${webhookData.type}`);
        return new Response(
          JSON.stringify({ message: `Unhandled event type: ${webhookData.type}` }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing Mux webhook:`, error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleAssetReady(webhookData: any, requestId: string) {
  try {
    const assetId = webhookData.object.id;
    if (!assetId) {
      throw new Error('Missing asset ID in webhook data');
    }
    
    console.log(`✅ [${requestId}] Processing asset ready for Mux asset ID: ${assetId}`);
    
    // Find the recording associated with this Mux asset ID
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('*')
      .eq('mux_asset_id', assetId);
      
    if (recordingsError) {
      throw new Error(`Failed to fetch recordings: ${recordingsError.message}`);
    }
    
    if (!recordings || recordings.length === 0) {
      console.log(`⚠️ [${requestId}] No recordings found for Mux asset: ${assetId}`);
      return new Response(
        JSON.stringify({ message: 'No matching recording found' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update the status for each matching recording
    for (const recording of recordings) {
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recording.id);
        
      if (updateError) {
        console.error(`❌ [${requestId}] Error updating recording status:`, updateError);
      } else {
        console.log(`✅ [${requestId}] Updated recording status to 'ready' for recording ID: ${recording.id}`);
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Processing completed' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in handleAssetReady:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleAssetError(webhookData: any, requestId: string) {
  try {
    const assetId = webhookData.object.id;
    const errorMessage = webhookData.data?.error || 'Unknown error processing asset';
    
    console.log(`❌ [${requestId}] Processing asset error for Mux asset ID: ${assetId}`);
    console.log(`❌ [${requestId}] Error details: ${errorMessage}`);
    
    // Find the recording associated with this Mux asset ID
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('*')
      .eq('mux_asset_id', assetId);
      
    if (recordingsError) {
      throw new Error(`Failed to fetch recordings: ${recordingsError.message}`);
    }
    
    if (!recordings || recordings.length === 0) {
      console.log(`⚠️ [${requestId}] No recordings found for Mux asset: ${assetId}`);
      return new Response(
        JSON.stringify({ message: 'No matching recording found' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update the status for each matching recording
    for (const recording of recordings) {
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          status: 'processing_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recording.id);
        
      if (updateError) {
        console.error(`❌ [${requestId}] Error updating recording status:`, updateError);
      } else {
        console.log(`✅ [${requestId}] Updated recording status to 'processing_failed' for recording ID: ${recording.id}`);
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Error status recorded' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in handleAssetError:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleRenditionsReady(webhookData: any, requestId: string) {
  try {
    const assetId = webhookData.object.id;
    
    console.log(`✅ [${requestId}] Static renditions ready for Mux asset ID: ${assetId}`);
    
    // No need to update the recording status here - we'll rely on the video.asset.ready event
    
    return new Response(
      JSON.stringify({ success: true, message: 'Renditions ready acknowledged' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in handleRenditionsReady:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
