
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
    const twoHoursAgo = new Date();
    twoHoursAgo.setMinutes(twoHoursAgo.getMinutes() - 30);
    
    const { data: stalledRecordings, error } = await supabase
      .from('recordings')
      .select('id, mux_asset_id, updated_at')
      .eq('status', 'processing')
      .lt('updated_at', twoHoursAgo.toISOString());
    
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
        console.log(`[${requestId}] Checking Mux asset status for recording ${recording.id} with asset ${recording.mux_asset_id}`);
        
        // Skip records without a Mux asset ID
        if (!recording.mux_asset_id) {
          console.log(`[${requestId}] Recording ${recording.id} has no Mux asset ID, skipping`);
          continue;
        }
        
        // Check actual status from Mux API
        const muxAsset = await getMuxAsset(recording.mux_asset_id, requestId);
        
        if (!muxAsset) {
          console.log(`[${requestId}] Could not retrieve Mux asset ${recording.mux_asset_id}`);
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
