import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId, notetakerId } = await req.json();
    console.log('📝 Processing media request for:', { recordingId, notetakerId });
    
    if (!recordingId || !notetakerId) {
      console.error('❌ Missing required parameters:', { recordingId, notetakerId });
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to retrieving before attempting to get media
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        status: 'retrieving',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('❌ Error updating recording status:', updateError);
      throw updateError;
    }

    // Attempt to get recording media
    try {
      console.log('🔄 Fetching recording from AWS...');
      
      const response = await fetch(`https://api-staging.us.nylas.com/v3/notetakers/${notetakerId}/media`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch media from Nylas:', response.status, await response.text());
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      const mediaData = await response.json();
      console.log('✅ Successfully retrieved media data from Nylas');

      // Prepare media for Mux upload
      console.log('🎥 Preparing to upload to Mux...');
      const formData = new FormData();
      
      // Fetch the actual media content
      const mediaResponse = await fetch(mediaData.download_url);
      const mediaBlob = await mediaResponse.blob();
      formData.append('file', mediaBlob, 'recording.webm');

      console.log('📤 Uploading to Mux...');
      const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(Deno.env.get('MUX_TOKEN_ID')! + ':' + Deno.env.get('MUX_TOKEN_SECRET')!)}`,
        },
        body: formData,
      });

      if (!muxResponse.ok) {
        console.error('❌ Failed to upload to Mux:', await muxResponse.text());
        throw new Error(`Failed to upload to Mux: ${muxResponse.statusText}`);
      }

      const muxData = await muxResponse.json();
      const assetId = muxData.data.id;
      console.log('✅ Successfully uploaded to Mux. Asset ID:', assetId);

      const { error: finalUpdateError } = await supabase
        .from('recordings')
        .update({
          mux_asset_id: assetId,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (finalUpdateError) {
        console.error('❌ Error updating recording with Mux asset ID:', finalUpdateError);
        throw finalUpdateError;
      }

      return new Response(
        JSON.stringify({ success: true, assetId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('❌ Error processing media:', error);
      
      // Update status to error if media retrieval fails
      await supabase
        .from('recordings')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      throw error;
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});