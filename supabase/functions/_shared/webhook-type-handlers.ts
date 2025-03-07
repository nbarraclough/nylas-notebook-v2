
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { createMuxAsset, fetchTranscriptContent } from './mux-utils.ts';
import { handleEventCreated, handleEventUpdated, handleEventDeleted } from './handlers/event-handlers.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function handleWebhookType(webhookData: any, grantId: string, requestId: string) {
  console.log(`🎯 [${requestId}] Processing webhook type: ${webhookData.type}`);

  try {
    switch (webhookData.type) {
      case 'notetaker.created':
        return await handleNotetakerCreatedWebhook(webhookData, grantId, requestId);
      case 'event.created':
        return await handleEventCreated(webhookData.data.object, grantId);
      case 'event.updated':
        return await handleEventUpdated(webhookData.data.object, grantId);
      case 'event.deleted':
        return await handleEventDeleted(webhookData.data.object, grantId);
      case 'notetaker.status_updated':
        return await handleNotetakerStatusWebhook(webhookData, grantId, requestId);
      case 'notetaker.meeting_state':
        return await handleNotetakerMeetingStateWebhook(webhookData, grantId, requestId);
      case 'notetaker.media':
        return await handleNotetakerMediaWebhook(webhookData, grantId, requestId);
      default:
        console.log(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
        return null;
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleWebhookType:`, error);
    throw error;
  }
}

async function handleNotetakerCreatedWebhook(webhookData: any, grantId: string, requestId: string) {
  try {
    const notetakerId = webhookData.data.object.id;
    console.log(`📝 [${requestId}] Processing notetaker created webhook for notetaker: ${notetakerId}`);

    // Get the existing recording that should have been created when we called POST /notetakers
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('notetaker_id', notetakerId)
      .maybeSingle();

    if (recordingError) {
      console.error(`❌ [${requestId}] Error finding recording for notetaker ${notetakerId}:`, recordingError);
      throw recordingError;
    }

    // If we have a recording, update it with any additional metadata from the webhook
    if (recording) {
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      // Add meeting_settings if provided
      if (webhookData.data.object.meeting_settings) {
        updates.meeting_settings = webhookData.data.object.meeting_settings;
      }

      // Add join_time if provided
      if (webhookData.data.object.join_time) {
        updates.join_time = new Date(webhookData.data.object.join_time).toISOString();
      }

      // Update the recording with new metadata
      const { error: updateError } = await supabase
        .from('recordings')
        .update(updates)
        .eq('id', recording.id);

      if (updateError) {
        console.error(`❌ [${requestId}] Error updating recording with metadata:`, updateError);
        throw updateError;
      }

      console.log(`✅ [${requestId}] Successfully processed notetaker.created webhook for recording ${recording.id}`);
      return { recordingId: recording.id };
    } else {
      console.log(`⚠️ [${requestId}] No existing recording found for notetaker ${notetakerId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleNotetakerCreatedWebhook:`, error);
    throw error;
  }
}

async function handleNotetakerStatusWebhook(webhookData: any, grantId: string, requestId: string) {
  try {
    const notetakerId = webhookData.data.object.id;
    const newStatus = webhookData.data.object.status;

    console.log(`📝 [${requestId}] Processing notetaker status update:`, { notetakerId, newStatus });

    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .update({ 
        notetaker_status: newStatus,
        status: mapNotetakerStatusToRecordingStatus(newStatus),
        updated_at: new Date().toISOString()
      })
      .eq('notetaker_id', notetakerId)
      .select()
      .maybeSingle();

    if (recordingError) {
      console.error(`❌ [${requestId}] Error updating recording status:`, recordingError);
      throw recordingError;
    }

    if (!recording) {
      console.log(`⚠️ [${requestId}] No recording found for notetaker ${notetakerId}`);
      return null;
    }

    console.log(`✅ [${requestId}] Updated recording ${recording.id} notetaker status to ${newStatus}`);
    return { recordingId: recording.id };
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleNotetakerStatusWebhook:`, error);
    throw error;
  }
}

// Helper function to map notetaker status to recording status
function mapNotetakerStatusToRecordingStatus(notetakerStatus: string): string {
  switch (notetakerStatus) {
    case 'attending':
    case 'recording_active':
      return 'recording_active';
    case 'concluded':
    case 'no_meeting_activity':
    case 'no_participants':
      return 'concluded';
    case 'failed':
    case 'internal_error':
    case 'bad_meeting_code':
    case 'api':
      return 'failed';
    default:
      return notetakerStatus;
  }
}

async function handleNotetakerMeetingStateWebhook(webhookData: any, grantId: string, requestId: string) {
  try {
    const notetakerId = webhookData.data.object.id;
    const newState = webhookData.data.object.meeting_state;

    console.log(`📝 [${requestId}] Processing notetaker meeting state update:`, { notetakerId, newState });

    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .update({ meeting_state: newState })
      .eq('notetaker_id', notetakerId)
      .select()
      .maybeSingle();

    if (recordingError) {
      console.error(`❌ [${requestId}] Error updating recording meeting state:`, recordingError);
      throw recordingError;
    }

    if (!recording) {
      console.log(`⚠️ [${requestId}] No recording found for notetaker ${notetakerId}`);
      return null;
    }

    console.log(`✅ [${requestId}] Updated recording ${recording.id} meeting state to ${newState}`);
    return { recordingId: recording.id };
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleNotetakerMeetingStateWebhook:`, error);
    throw error;
  }
}

async function handleNotetakerMediaWebhook(webhookData: any, grantId: string, requestId: string) {
  try {
    const notetakerId = webhookData.data.object.id;
    
    // Extract media URLs using the correct path based on the new webhook format
    // The structure is now different with a 'media' object containing the URLs
    const mediaObject = webhookData.data.object.media || {};
    const recordingUrl = mediaObject.recording || null;
    const transcriptUrl = mediaObject.transcript || null;
    const mediaStatus = webhookData.data.object.status || 'ready';

    console.log(`📝 [${requestId}] Processing notetaker media update:`, { 
      notetakerId, 
      mediaStatus,
      hasRecordingUrl: !!recordingUrl,
      hasTranscriptUrl: !!transcriptUrl
    });

    // Log full webhook payload for debugging
    console.log(`🔍 [${requestId}] Full notetaker.media webhook payload:`, JSON.stringify(webhookData));

    // First retrieve the recording that matches this notetaker
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('notetaker_id', notetakerId)
      .maybeSingle();

    if (recordingError) {
      console.error(`❌ [${requestId}] Error finding recording for notetaker ${notetakerId}:`, recordingError);
      throw recordingError;
    }

    if (!recording) {
      console.log(`⚠️ [${requestId}] No recording found for notetaker ${notetakerId}`);
      return null;
    }

    // Prepare update payload
    const updates: any = {
      media_status: mediaStatus,
      updated_at: new Date().toISOString()
    };

    // Add recording URL if available
    if (recordingUrl) {
      console.log(`🎥 [${requestId}] Recording URL found: ${recordingUrl}`);
      updates.recording_url = recordingUrl;
      
      // Update status to reflect that we have the media
      if (mediaStatus === 'available' || mediaStatus === 'ready') {
        updates.status = 'media_ready';
      }
    }

    // Add transcript URL if available
    if (transcriptUrl) {
      console.log(`📄 [${requestId}] Transcript URL found: ${transcriptUrl}`);
      updates.transcript_url = transcriptUrl;
      updates.transcript_status = 'available';
      
      // Set expiration time for transcript URL (24 hours from now)
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() + 24);
      updates.transcript_url_expires_at = expirationTime.toISOString();
      
      // Try to immediately fetch and process the transcript content
      try {
        console.log(`📝 [${requestId}] Attempting to fetch transcript content immediately`);
        const transcriptContent = await fetchTranscriptContent(transcriptUrl, requestId);
        
        if (transcriptContent && Array.isArray(transcriptContent) && transcriptContent.length > 0) {
          console.log(`✅ [${requestId}] Successfully fetched transcript with ${transcriptContent.length} entries`);
          updates.transcript_content = transcriptContent;
          updates.transcript_status = 'ready';
          updates.transcript_fetch_attempts = 0;
        } else {
          console.log(`⚠️ [${requestId}] Transcript URL available but content fetch failed. Will try again later.`);
        }
      } catch (transcriptError) {
        console.error(`❌ [${requestId}] Error fetching transcript content immediately:`, transcriptError);
        // We'll try again later through the normal process
      }
    }

    // Update the recording
    const { data: updatedRecording, error: updateError } = await supabase
      .from('recordings')
      .update(updates)
      .eq('id', recording.id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ [${requestId}] Error updating recording with media details:`, updateError);
      throw updateError;
    }

    console.log(`✅ [${requestId}] Updated recording ${recording.id} with media status: ${mediaStatus}`);

    // If we have a recording URL and status is ready/available, process the recording media (create Mux asset)
    if (recordingUrl && (mediaStatus === 'ready' || mediaStatus === 'available') && !recording.mux_asset_id) {
      try {
        // Process the recording (upload to Mux)
        await processRecordingMedia(recording.id, recordingUrl, requestId);
      } catch (processingError) {
        console.error(`❌ [${requestId}] Error processing recording media:`, processingError);
        
        // Update recording status to reflect the processing error
        await supabase
          .from('recordings')
          .update({ 
            status: 'processing_failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', recording.id);
          
        // We don't throw here to prevent the webhook from failing
        // The recording will be in an error state that can be retried later
      }
    } else if (recordingUrl && (mediaStatus === 'ready' || mediaStatus === 'available') && recording.mux_asset_id) {
      console.log(`ℹ️ [${requestId}] Mux asset already exists for recording ${recording.id}. Skipping processing.`);
    }

    return { recordingId: recording.id };
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleNotetakerMediaWebhook:`, error);
    throw error;
  }
}

// Helper function to process recording media (create Mux asset)
async function processRecordingMedia(recordingId: string, recordingUrl: string, requestId: string) {
  console.log(`🎬 [${requestId}] Processing media for recording ${recordingId}`);
  
  try {
    // Update status to processing
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error(`❌ [${requestId}] Error updating recording status to processing:`, updateError);
      throw updateError;
    }

    // Create Mux asset with the recording URL
    const muxResult = await createMuxAsset(recordingUrl, requestId);
    
    if (!muxResult || !muxResult.id || !muxResult.playback_ids?.[0]?.id) {
      throw new Error(`Invalid response from Mux: ${JSON.stringify(muxResult)}`);
    }

    console.log(`✅ [${requestId}] Created Mux asset for recording ${recordingId}: ${muxResult.id}`);

    // Update recording with Mux asset ID and playback ID
    const { error: muxUpdateError } = await supabase
      .from('recordings')
      .update({
        mux_asset_id: muxResult.id,
        mux_playback_id: muxResult.playback_ids[0].id,
        status: 'processing', // Status will be updated by the Mux webhook when processing is complete
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (muxUpdateError) {
      console.error(`❌ [${requestId}] Error updating recording with Mux details:`, muxUpdateError);
      throw muxUpdateError;
    }

    return true;
  } catch (error) {
    console.error(`❌ [${requestId}] Error in processRecordingMedia:`, error);
    throw error;
  }
}
