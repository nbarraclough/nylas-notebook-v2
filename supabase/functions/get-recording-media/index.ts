
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'
import { createMuxAsset } from '../_shared/mux-utils.ts';

console.log("Loading get-recording-media function")

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  // Generate a unique ID for this request to trace through logs
  const requestId = crypto.randomUUID();
  console.log(`🔍 [${requestId}] Processing request to get-recording-media`);

  try {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error(`Auth failed: ${authError?.message || 'User not found'}`);
    }

    // Get request body
    const { recordingId, notetakerId } = await req.json();
    
    if (!recordingId && !notetakerId) {
      throw new Error('Either recordingId or notetakerId is required');
    }

    console.log(`🔍 [${requestId}] Looking up recording with ${recordingId ? 'recordingId' : 'notetakerId'}: ${recordingId || notetakerId}`);

    // Find the recording
    let query = supabase
      .from('recordings')
      .select('*');

    if (recordingId) {
      query = query.eq('id', recordingId);
    } else {
      query = query.eq('notetaker_id', notetakerId);
    }

    const { data: recording, error: recordingError } = await query.maybeSingle();

    if (recordingError) {
      throw new Error(`Error fetching recording: ${recordingError.message}`);
    }

    if (!recording) {
      throw new Error(`Recording not found`);
    }

    if (recording.user_id !== user.id) {
      throw new Error('You do not have permission to access this recording');
    }

    // If recording already has a Mux asset ID, return it
    if (recording.mux_asset_id && recording.mux_playback_id) {
      console.log(`✅ [${requestId}] Recording already has Mux asset: ${recording.mux_asset_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recording already processed',
          mux_asset_id: recording.mux_asset_id,
          mux_playback_id: recording.mux_playback_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Check if we have recording URL
    if (!recording.recording_url) {
      // If media status is not ready yet, return error
      if (recording.media_status !== 'ready') {
        throw new Error('MEDIA_NOT_READY: Recording media is not ready yet');
      }
      
      // If media status is ready but we don't have a URL, something is wrong
      throw new Error('Recording URL not found even though media status is ready');
    }

    // Update status to retrieving
    await supabase
      .from('recordings')
      .update({
        status: 'retrieving',
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id);

    // Create Mux asset
    console.log(`🎬 [${requestId}] Creating Mux asset for recording ${recording.id}`);
    const muxAsset = await createMuxAsset(recording.recording_url, requestId);

    if (!muxAsset || !muxAsset.id || !muxAsset.playback_ids?.[0]?.id) {
      throw new Error(`Failed to create Mux asset`);
    }

    // Update recording with Mux info
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        mux_asset_id: muxAsset.id,
        mux_playback_id: muxAsset.playback_ids[0].id,
        status: 'processing', // Will be updated by Mux webhook when ready
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id);

    if (updateError) {
      throw new Error(`Error updating recording: ${updateError.message}`);
    }

    console.log(`✅ [${requestId}] Successfully created Mux asset ${muxAsset.id} for recording ${recording.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processing started',
        mux_asset_id: muxAsset.id,
        mux_playback_id: muxAsset.playback_ids[0].id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error.message);
    
    // Special handling for media not ready yet
    if (error.message.includes('MEDIA_NOT_READY')) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'MEDIA_NOT_READY',
          message: 'The recording is still being processed. Please try again in a few moments.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/get-recording-media' \
//   --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
//   --header 'Content-Type: application/json' \
//   --data '{"recordingId":"RECORDING_ID"}'
