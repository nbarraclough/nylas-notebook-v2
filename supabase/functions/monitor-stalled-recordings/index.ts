
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getMuxAsset } from "../_shared/mux-utils.ts";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// This function will be invoked by a cron job
Deno.serve(async (req) => {
  // Generate a unique request ID for tracing
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting monitor-stalled-recordings job`);
  
  try {
    // Find recordings that are stuck in "processing" state for over 30 minutes
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    const { data: stalledRecordings, error } = await supabase
      .from('recordings')
      .select('id, mux_asset_id, updated_at, transcript_url, transcript_content, transcript_url_expires_at, transcript_fetch_attempts')
      .or(`status.eq.processing,transcript_status.eq.fetch_failed`)
      .lt('updated_at', thirtyMinutesAgo.toISOString());
    
    if (error) {
      console.error(`[${requestId}] Error fetching stalled recordings:`, error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stalled recordings' }),
        { status: 500 }
      );
    }
    
    console.log(`[${requestId}] Found ${stalledRecordings.length} stalled recordings`);
    
    // Process each stalled recording
    const results = [];
    for (const recording of stalledRecordings) {
      try {
        // Check if we need to process the video, the transcript, or both
        const needProcessVideo = recording.mux_asset_id ? true : false;
        const needProcessTranscript = recording.transcript_url && 
          (!recording.transcript_content || recording.transcript_content.length === 0) &&
          (recording.transcript_fetch_attempts || 0) < 5;

        if (needProcessVideo) {
          console.log(`[${requestId}] Checking Mux asset status for recording ${recording.id} with asset ${recording.mux_asset_id}`);
          
          // Check actual status from Mux API
          const muxAsset = await getMuxAsset(recording.mux_asset_id, requestId);
          
          if (!muxAsset) {
            console.log(`[${requestId}] Could not retrieve Mux asset ${recording.mux_asset_id}`);
            results.push({ id: recording.id, success: false, error: 'Could not retrieve Mux asset' });
            continue;
          }
          
          console.log(`[${requestId}] Mux asset ${recording.mux_asset_id} status: ${muxAsset.status}`);
          
          // Update recording based on actual Mux status
          let newStatus;
          let updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };
          
          if (muxAsset.status === 'ready') {
            newStatus = 'ready';
            
            // Get the playback ID if available
            if (muxAsset.playback_ids && muxAsset.playback_ids.length > 0) {
              updateData.mux_playback_id = muxAsset.playback_ids[0].id;
            }
          } else if (muxAsset.status === 'errored') {
            newStatus = 'error';
          } else {
            // Still processing or in another state
            newStatus = muxAsset.status === 'preparing' ? 'processing' : muxAsset.status;
          }
          
          updateData.status = newStatus;
          
          // Update the recording in Supabase
          const { error: updateError } = await supabase
            .from('recordings')
            .update(updateData)
            .eq('id', recording.id);
          
          if (updateError) {
            console.error(`[${requestId}] Error updating recording ${recording.id}:`, updateError);
            results.push({ id: recording.id, success: false, error: updateError.message });
          } else {
            console.log(`[${requestId}] Successfully updated recording ${recording.id} to status ${newStatus}`);
            results.push({ id: recording.id, success: true, newStatus });
            
            // If the status is now ready, trigger an email notification
            if (newStatus === 'ready') {
              console.log(`[${requestId}] Triggering email notification for recording ${recording.id}`);
              
              // Get recording details for email
              const { data: recordingDetails } = await supabase
                .from('recordings')
                .select(`
                  id, 
                  user_id,
                  profiles:user_id (nylas_grant_id)
                `)
                .eq('id', recording.id)
                .single();
                
              if (recordingDetails) {
                // Send email notification
                const { error: emailError } = await supabase.functions.invoke('send-recording-ready-email', {
                  body: {
                    recordingId: recordingDetails.id,
                    userId: recordingDetails.user_id,
                    grantId: recordingDetails.profiles?.nylas_grant_id
                  }
                });
                
                if (emailError) {
                  console.error(`[${requestId}] Error sending email notification:`, emailError);
                }
              }
            }
          }
        }

        // Handle transcript processing separately
        if (needProcessTranscript) {
          console.log(`[${requestId}] Processing missing transcript for recording ${recording.id}`);
          
          // Check if the URL is expired
          const urlExpired = recording.transcript_url_expires_at && 
            new Date(recording.transcript_url_expires_at) < new Date();
          
          if (urlExpired) {
            console.log(`[${requestId}] Transcript URL for recording ${recording.id} has expired`);
            
            // Initiate a refresh of the recording media to get a new URL
            const { error: refreshError } = await supabase.functions.invoke('get-recording-media', {
              body: { 
                recordingId: recording.id,
                forceRefresh: true
              },
            });
            
            if (refreshError) {
              console.error(`[${requestId}] Error refreshing media for recording ${recording.id}:`, refreshError);
              results.push({ 
                id: recording.id, 
                success: false, 
                part: 'transcript', 
                error: 'Failed to refresh expired media URL'
              });
            } else {
              console.log(`[${requestId}] Successfully initiated media refresh for recording ${recording.id}`);
              results.push({ 
                id: recording.id, 
                success: true, 
                part: 'transcript', 
                action: 'refreshed_urls' 
              });
            }
          } else {
            // URL is still valid, retry transcript fetch directly
            try {
              const { data: recordingWithGrantId } = await supabase
                .from('recordings')
                .select(`
                  id, 
                  user_id,
                  transcript_url,
                  transcript_fetch_attempts,
                  profiles:user_id (nylas_grant_id)
                `)
                .eq('id', recording.id)
                .single();
                
              if (recordingWithGrantId && recordingWithGrantId.transcript_url) {
                // Use get-recording-media to handle transcript fetching with proper retries
                const { error: getMediaError } = await supabase.functions.invoke('get-recording-media', {
                  body: { 
                    recordingId: recording.id,
                    forceRefresh: false  // Don't force full refresh, just handle transcript
                  },
                });
                
                if (getMediaError) {
                  console.error(`[${requestId}] Error fetching transcript for recording ${recording.id}:`, getMediaError);
                  
                  // Update attempts counter
                  await supabase
                    .from('recordings')
                    .update({
                      transcript_fetch_attempts: (recording.transcript_fetch_attempts || 0) + 1,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', recording.id);
                    
                  results.push({ 
                    id: recording.id, 
                    success: false, 
                    part: 'transcript', 
                    error: 'Failed to fetch transcript' 
                  });
                } else {
                  console.log(`[${requestId}] Successfully initiated transcript fetch for recording ${recording.id}`);
                  results.push({ 
                    id: recording.id, 
                    success: true, 
                    part: 'transcript', 
                    action: 'fetched_transcript' 
                  });
                }
              }
            } catch (transcriptError) {
              console.error(`[${requestId}] Error processing transcript for recording ${recording.id}:`, transcriptError);
              results.push({ 
                id: recording.id, 
                success: false, 
                part: 'transcript', 
                error: transcriptError.message 
              });
            }
          }
        }
      } catch (processingError) {
        console.error(`[${requestId}] Error processing recording ${recording.id}:`, processingError);
        results.push({ id: recording.id, success: false, error: processingError.message });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: stalledRecordings.length,
        results
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${requestId}] Job execution error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
