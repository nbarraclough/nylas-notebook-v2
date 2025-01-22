import { corsHeaders } from './cors.ts';
import { 
  handleEventCreated, 
  handleEventUpdated, 
  handleEventDeleted,
  handleGrantCreated,
  handleGrantUpdated,
  handleGrantDeleted,
  handleGrantExpired 
} from './webhook-handlers.ts';
import { logWebhookSuccess, logWebhookError } from './webhook-logger.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

type NotetakerStatus = 'joining' | 'waiting_for_admission' | 'failed_entry' | 'attending' | 'leaving' | 'concluded';
type RecordingStatus = 'joining' | 'waiting_for_admission' | 'failed_entry' | 'recording' | 'leaving' | 'concluded';

const statusMap: Record<NotetakerStatus, { status: RecordingStatus; notetaker_status: NotetakerStatus }> = {
  'joining': { status: 'joining', notetaker_status: 'joining' },
  'waiting_for_admission': { status: 'waiting_for_admission', notetaker_status: 'waiting_for_admission' },
  'failed_entry': { status: 'failed_entry', notetaker_status: 'failed_entry' },
  'attending': { status: 'recording', notetaker_status: 'attending' },
  'leaving': { status: 'leaving', notetaker_status: 'leaving' },
  'concluded': { status: 'concluded', notetaker_status: 'concluded' }
};

async function handleNotetakerStatusUpdate(notetakerId: string, status: NotetakerStatus) {
  try {
    console.log(`🤖 Processing status update for notetaker: ${notetakerId}, status: ${status}`);
    
    if (!Object.keys(statusMap).includes(status)) {
      console.error('❌ Invalid notetaker status received:', status);
      throw new Error(`Invalid notetaker status: ${status}`);
    }

    const mappedStatus = statusMap[status];
    
    // Find recordings for this notetaker
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('id, status')
      .eq('notetaker_id', notetakerId);

    if (recordingsError) {
      console.error('❌ Error finding recordings:', recordingsError);
      throw recordingsError;
    }

    if (!recordings?.length) {
      console.error('❌ No recordings found for notetaker:', notetakerId);
      throw new Error('No recordings found for notetaker');
    }

    console.log(`📝 Found ${recordings.length} recordings for notetaker ${notetakerId}`);

    // Update all recordings for this notetaker
    const updatePromises = recordings.map(async (recording) => {
      console.log(`🔄 Updating recording ${recording.id} status to ${mappedStatus.status}`);
      
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ 
          status: mappedStatus.status,
          notetaker_status: mappedStatus.notetaker_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id);

      if (updateError) {
        console.error(`❌ Error updating recording ${recording.id}:`, updateError);
        throw updateError;
      }

      console.log(`✅ Successfully updated recording ${recording.id}`);
    });

    await Promise.all(updatePromises);
    return { success: true, message: `Processed status update for ${recordings.length} recordings` };
  } catch (error) {
    console.error('❌ Error handling notetaker status update:', error);
    throw error;
  }
}

type NotetakerMediaStatus = 'media_processing' | 'media_available' | 'media_processing_failed';
type RecordingMediaStatus = 'processing' | 'retrieving' | 'failed';

const mediaStatusMap: Record<NotetakerMediaStatus, RecordingMediaStatus> = {
  media_processing: 'processing',
  media_available: 'retrieving',
  media_processing_failed: 'failed'
};

async function handleNotetakerMediaUpdated(notetakerId: string, status: NotetakerMediaStatus) {
  try {
    console.log(`🎥 Processing media update for notetaker: ${notetakerId}, status: ${status}`);
    
    if (!Object.keys(mediaStatusMap).includes(status)) {
      console.error('❌ Invalid media status received:', status);
      throw new Error(`Invalid media status: ${status}`);
    }

    const recordingStatus = mediaStatusMap[status];
    
    // Find recordings for this notetaker
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('id, status')
      .eq('notetaker_id', notetakerId);

    if (recordingsError) {
      console.error('❌ Error finding recordings:', recordingsError);
      throw recordingsError;
    }

    if (!recordings?.length) {
      console.error('❌ No recordings found for notetaker:', notetakerId);
      throw new Error('No recordings found for notetaker');
    }

    console.log(`📝 Found ${recordings.length} recordings for notetaker ${notetakerId}`);

    // Update all recordings for this notetaker
    const updatePromises = recordings.map(async (recording) => {
      console.log(`🔄 Updating recording ${recording.id} status to ${recordingStatus}`);
      
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ 
          status: recordingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id);

      if (updateError) {
        console.error(`❌ Error updating recording ${recording.id}:`, updateError);
        throw updateError;
      }

      // If media is available, trigger media retrieval
      if (status === 'media_available') {
        console.log(`📥 Triggering media retrieval for recording ${recording.id}`);
        const { error: retrievalError } = await supabase.functions.invoke('get-recording-media', {
          body: { 
            recordingId: recording.id,
            notetakerId
          },
        });

        if (retrievalError) {
          console.error(`❌ Error triggering media retrieval for recording ${recording.id}:`, retrievalError);
          throw retrievalError;
        }
      }

      // If processing failed, log detailed error
      if (status === 'media_processing_failed') {
        console.error(`❌ Recording processing failed for ${recording.id}`);
      }

      console.log(`✅ Successfully updated recording ${recording.id}`);
    });

    await Promise.all(updatePromises);
    return { success: true, message: `Processed media update for ${recordings.length} recordings` };
  } catch (error) {
    console.error('❌ Error handling notetaker media update:', error);
    throw error;
  }
}

export const handleWebhookType = async (webhookData: any, grantId: string, requestId: string) => {
  try {
    switch (webhookData.type) {
      case 'event.created':
        const createResult = await handleEventCreated(webhookData.data.object, grantId);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: createResult };

      case 'event.updated':
        const updateResult = await handleEventUpdated(webhookData.data.object, grantId);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: updateResult };

      case 'event.deleted':
        const deleteResult = await handleEventDeleted(webhookData.data.object, grantId);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: deleteResult };

      case 'grant.created':
        const grantCreateResult = await handleGrantCreated(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantCreateResult };

      case 'grant.updated':
        const grantUpdateResult = await handleGrantUpdated(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantUpdateResult };

      case 'grant.deleted':
        const grantDeleteResult = await handleGrantDeleted(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantDeleteResult };

      case 'grant.expired':
        const grantExpireResult = await handleGrantExpired(webhookData.data);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: grantExpireResult };

      case 'notetaker.media_updated':
        console.log(`📝 [${requestId}] Processing ${webhookData.type} webhook`);
        console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
        
        const notetakerId = webhookData.data.object.notetaker_id;
        const mediaStatus = webhookData.data.object.status as NotetakerMediaStatus;
        
        if (!notetakerId) {
          console.error('❌ Missing notetaker_id in media_updated webhook', webhookData);
          return { 
            success: false, 
            message: 'Missing notetaker_id in webhook data' 
          };
        }

        const mediaResult = await handleNotetakerMediaUpdated(notetakerId, mediaStatus);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: mediaResult };

      case 'notetaker.status_updated':
        console.log(`🤖 [${requestId}] Processing ${webhookData.type} webhook`);
        console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
        
        const statusNotetakerId = webhookData.data.object.notetaker_id;
        const notetakerStatus = webhookData.data.object.status as NotetakerStatus;
        
        if (!statusNotetakerId) {
          console.error('❌ Missing notetaker_id in status_updated webhook', webhookData);
          return { 
            success: false, 
            message: 'Missing notetaker_id in webhook data' 
          };
        }

        const statusResult = await handleNotetakerStatusUpdate(statusNotetakerId, notetakerStatus);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: statusResult };

      default:
        console.log(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
        return { 
          success: false, 
          message: `Unhandled webhook type: ${webhookData.type}` 
        };
    }
  } catch (error) {
    logWebhookError('webhook type handling', error);
    return { 
      success: false, 
      message: `Error processing webhook: ${error.message}` 
    };
  }
};