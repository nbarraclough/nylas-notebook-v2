import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { recordingId, notetakerId } = await req.json();
    console.log('📝 Processing media request for:', { recordingId, notetakerId });
    
    if (!recordingId || !notetakerId) {
      console.error('❌ Missing required parameters:', { recordingId, notetakerId });
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user's grant ID from the recordings table by joining with profiles
    const { data: recordingData, error: recordingError } = await supabaseClient
      .from('recordings')
      .select(`
        user_id,
        profiles:user_id (
          nylas_grant_id
        )
      `)
      .eq('id', recordingId)
      .single();

    if (recordingError || !recordingData?.profiles?.nylas_grant_id) {
      console.error('❌ Error fetching grant ID:', recordingError);
      throw new Error('Could not find grant ID for recording');
    }

    const grantId = recordingData.profiles.nylas_grant_id;

    // Update status to retrieving before attempting to get media
    const { error: updateError } = await supabaseClient
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

    // Attempt to get recording media using the correct endpoint
    try {
      const nylasUrl = `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/media`;
      const nylasHeaders = {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Accept': 'application/json, application/gzip',
      };

      console.log('🔄 Preparing Nylas request:', {
        url: nylasUrl,
        method: 'GET',
        headers: {
          ...nylasHeaders,
          'Authorization': 'Bearer [REDACTED]'
        }
      });
      
      const response = await fetch(nylasUrl, {
        method: 'GET',
        headers: nylasHeaders,
      });

      const responseText = await response.text();
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

      // Get the recording URL from the correct location in the response
      const recordingUrl = mediaData.data?.recording?.url;
      if (!recordingUrl) {
        console.error('❌ No recording URL in Nylas response:', mediaData);
        throw new Error('No recording URL in Nylas response');
      }

      console.log('✅ Successfully retrieved media data from Nylas:', {
        mediaData: {
          ...mediaData,
          data: {
            ...mediaData.data,
            recording: {
              ...mediaData.data.recording,
              url: '[REDACTED]'
            }
          }
        }
      });

      // Prepare Mux request payload
      const muxPayload = {
        input: [{
          url: recordingUrl
        }],
        playback_policy: ["public"],
        video_quality: "basic"
      };

      console.log('📤 Preparing Mux request payload:', {
        ...muxPayload,
        input: [{ url: '[REDACTED]' }]
      });

      const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(Deno.env.get('MUX_TOKEN_ID')! + ':' + Deno.env.get('MUX_TOKEN_SECRET')!)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(muxPayload)
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
      console.log('✅ Mux response:', {
        status: muxData.data.status,
        assetId: muxData.data.id,
        playbackId: muxData.data.playback_ids?.[0]?.id
      });

      // Store transcript URL if available
      const transcriptUrl = mediaData.data?.transcript?.url;

      const { error: finalUpdateError } = await supabaseClient
        .from('recordings')
        .update({
          mux_asset_id: muxData.data.id,
          mux_playback_id: muxData.data.playback_ids?.[0]?.id,
          recording_url: recordingUrl,
          transcript_url: transcriptUrl,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (finalUpdateError) {
        console.error('❌ Error updating recording with Mux asset ID:', finalUpdateError);
        throw finalUpdateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          assetId: muxData.data.id,
          playbackId: muxData.data.playback_ids?.[0]?.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('❌ Error processing media:', error);
      
      // Update status to error if media retrieval fails
      await supabaseClient
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