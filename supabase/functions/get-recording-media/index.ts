
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'
import { createMuxAsset, getNylasRecordingMedia, fetchTranscriptContent } from '../_shared/mux-utils.ts';
import { logFetchError, analyzeErrorType } from '../_shared/webhook-logger.ts';

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
    const { recordingId, notetakerId, forceRefresh = false } = await req.json();
    
    if (!recordingId && !notetakerId) {
      throw new Error('Either recordingId or notetakerId is required');
    }

    console.log(`🔍 [${requestId}] Looking up recording with ${recordingId ? 'recordingId' : 'notetakerId'}: ${recordingId || notetakerId}, forceRefresh: ${forceRefresh}`);

    // Find the recording
    let query = supabase
      .from('recordings')
      .select('*, profiles:user_id (nylas_grant_id)');

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

    // Check if recording is marked as unavailable
    if (recording.status === 'unavailable' && !forceRefresh) {
      console.log(`⚠️ [${requestId}] Recording is marked as unavailable and force refresh is not enabled`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'RECORDING_UNAVAILABLE',
          message: 'The recording is not available. Please try a different meeting.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // If recording already has a Mux asset ID and we're not forcing a refresh, return it
    if (recording.mux_asset_id && recording.mux_playback_id && !forceRefresh) {
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

    // Get the grant ID from the profiles relation
    const grantId = recording.profiles?.nylas_grant_id;
    if (!grantId) {
      throw new Error('No Nylas grant ID found for user');
    }

    // If we need to force refresh or don't have a recording URL, fetch it from Nylas
    let recordingUrl = recording.recording_url;
    let transcriptUrl = recording.transcript_url;
    let needToFetchFromNylas = forceRefresh || !recordingUrl || recordingUrl === '';
    
    if (needToFetchFromNylas) {
      console.log(`🔍 [${requestId}] ${forceRefresh ? 'Force refresh requested' : 'No recording URL found'}, fetching from Nylas API`);
      
      // If we don't have a recording URL, fetch it from Nylas
      if (!recording.notetaker_id) {
        throw new Error('No notetaker ID found for this recording');
      }

      try {
        // Get the recording media URLs from Nylas
        const { recordingUrl: newRecordingUrl, transcriptUrl: newTranscriptUrl } = 
          await getNylasRecordingMedia(grantId, recording.notetaker_id, requestId);
        
        if (!newRecordingUrl) {
          throw new Error('Failed to get recording URL from Nylas');
        }

        // Update our local variables
        recordingUrl = newRecordingUrl;
        transcriptUrl = newTranscriptUrl;

        // Prepare update object
        const updateData: Record<string, any> = {
          recording_url: newRecordingUrl,
          status: 'retrieving',
          media_status: 'ready',
          updated_at: new Date().toISOString()
        };

        // Add transcript URL if available
        if (newTranscriptUrl) {
          updateData.transcript_url = newTranscriptUrl;
          
          // Set expiration timestamp for the URL (typically 1 hour for Nylas signed URLs)
          const expirationTime = new Date();
          expirationTime.setHours(expirationTime.getHours() + 1);
          updateData.transcript_url_expires_at = expirationTime.toISOString();
          
          // Reset fetch attempts
          updateData.transcript_fetch_attempts = 0;
        }

        // Update the recording with the URLs
        const { error: updateError } = await supabase
          .from('recordings')
          .update(updateData)
          .eq('id', recording.id);

        if (updateError) {
          throw new Error(`Error updating recording with media URL: ${updateError.message}`);
        }
      } catch (error) {
        if (error.message.includes('media not ready') || error.message.toLowerCase().includes('no recording available')) {
          console.log(`⏳ [${requestId}] Media not ready yet from Nylas`);
          
          // Update recording status
          await supabase
            .from('recordings')
            .update({
              status: 'media_not_ready',
              updated_at: new Date().toISOString()
            })
            .eq('id', recording.id);
            
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'MEDIA_NOT_READY',
              message: 'The recording is still being processed by Nylas. Please try again in a few moments.' 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }
        
        throw error;
      }
    }

    // If we've previously determined the recording is unavailable, update the status
    if (recording.status === 'unavailable' && forceRefresh) {
      // Reset the status since we're forcing a refresh
      await supabase
        .from('recordings')
        .update({
          status: 'retrieving', 
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id);
    }

    // Process transcript content if URL is available but content isn't or we're forcing a refresh
    if (transcriptUrl && (!recording.transcript_content || forceRefresh)) {
      console.log(`📝 [${requestId}] ${forceRefresh ? 'Force refresh requested' : 'Found transcript URL but no content'}, fetching from: ${transcriptUrl}`);
      
      try {
        const transcriptContent = await fetchTranscriptContent(transcriptUrl, requestId);
        
        if (transcriptContent) {
          console.log(`📝 [${requestId}] Successfully processed transcript content with ${transcriptContent.length} entries`);
          await supabase
            .from('recordings')
            .update({
              transcript_content: transcriptContent,
              transcript_status: 'ready',
              transcript_fetch_attempts: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', recording.id);
        } else {
          // If we couldn't fetch transcript content, increment the attempt counter
          await supabase
            .from('recordings')
            .update({
              transcript_status: 'fetch_failed',
              transcript_fetch_attempts: (recording.transcript_fetch_attempts || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', recording.id);
            
          console.error(`❌ [${requestId}] Failed to fetch transcript content`);
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Error fetching transcript: ${error.message}`);
        
        // Update the transcript fetch attempts
        await supabase
          .from('recordings')
          .update({
            transcript_status: 'fetch_error',
            transcript_fetch_attempts: (recording.transcript_fetch_attempts || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', recording.id);
      }
    }
    
    // Update status to retrieving
    await supabase
      .from('recordings')
      .update({
        status: 'retrieving',
        updated_at: new Date().toISOString()
      })
      .eq('id', recording.id);

    // If we're forcing a refresh and already have a Mux asset, we need to create a new one
    if (forceRefresh && recording.mux_asset_id) {
      console.log(`🎬 [${requestId}] Force refresh requested. Creating new Mux asset for recording ${recording.id}`);
    } else {
      console.log(`🎬 [${requestId}] Creating Mux asset for recording ${recording.id} with URL ${recordingUrl}`);
    }
    
    const muxAsset = await createMuxAsset(recordingUrl, requestId);

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
