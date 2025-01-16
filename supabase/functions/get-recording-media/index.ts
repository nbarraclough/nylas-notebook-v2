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
      const nylasUrl = `https://api-staging.us.nylas.com/v3/notetakers/${notetakerId}/media`;
      const nylasHeaders = {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      console.log('🔄 Preparing Nylas request:', {
        url: nylasUrl,
        method: 'GET',
        headers: {
          ...nylasHeaders,
          'Authorization': 'Bearer [REDACTED]' // Don't log the actual token
        },
        notetakerId,
      });
      
      const response = await fetch(nylasUrl, {
        method: 'GET',
        headers: nylasHeaders,
      });

      const responseText = await response.text(); // Get raw response text first
      console.log('📥 Nylas response status:', response.status);
      console.log('📥 Nylas response headers:', Object.fromEntries(response.headers.entries()));
      console.log('📥 Nylas response body:', responseText);

      if (!response.ok) {
        console.error('❌ Failed to fetch media from Nylas:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      let mediaData;
      try {
        mediaData = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse Nylas response as JSON:', e);
        throw new Error('Invalid JSON response from Nylas');
      }

      console.log('✅ Successfully retrieved media data from Nylas:', {
        mediaData: {
          ...mediaData,
          download_url: mediaData.download_url ? '[REDACTED]' : undefined // Don't log the full URL
        }
      });

      // Prepare media for Mux upload
      console.log('🎥 Preparing to upload to Mux...');
      const formData = new FormData();
      
      // Fetch the actual media content
      console.log('📥 Fetching media content from download URL...');
      const mediaResponse = await fetch(mediaData.download_url);
      
      if (!mediaResponse.ok) {
        console.error('❌ Failed to fetch media content:', {
          status: mediaResponse.status,
          statusText: mediaResponse.statusText
        });
        throw new Error('Failed to fetch media content');
      }

      const mediaBlob = await mediaResponse.blob();
      console.log('📦 Media content size:', mediaBlob.size, 'bytes');
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
        const muxErrorText = await muxResponse.text();
        console.error('❌ Failed to upload to Mux:', {
          status: muxResponse.status,
          statusText: muxResponse.statusText,
          error: muxErrorText
        });
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