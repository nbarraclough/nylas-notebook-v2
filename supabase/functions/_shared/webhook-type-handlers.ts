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

async function handleNotetakerMediaUpdated(notetakerId: string, status: string) {
  try {
    console.log(`🎥 Processing media update for notetaker: ${notetakerId}, status: ${status}`);
    
    // Only proceed if status is "media_available"
    if (status !== "media_available") {
      console.log(`⏭️ Skipping media refresh for status: ${status}`);
      return { success: true, message: `Skipped media refresh for status: ${status}` };
    }

    // Update recordings status to "retrieving" before processing
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ status: 'retrieving', updated_at: new Date().toISOString() })
      .eq('notetaker_id', notetakerId);

    if (updateError) {
      console.error('❌ Error updating recording status:', updateError);
      throw updateError;
    }

    // Find all recordings for this notetaker
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('id, notetaker_id')
      .eq('notetaker_id', notetakerId);

    if (recordingsError) {
      throw recordingsError;
    }

    console.log(`📝 Found ${recordings?.length || 0} recordings for notetaker ${notetakerId}`);

    // For each recording, trigger media refresh
    const refreshPromises = recordings?.map(async (recording) => {
      console.log(`🔄 Refreshing media for recording: ${recording.id}`);
      
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId: recording.id,
          notetakerId: recording.notetaker_id
        },
      });

      if (error) {
        console.error(`❌ Error refreshing media for recording ${recording.id}:`, error);
        throw error;
      }

      console.log(`✅ Successfully refreshed media for recording ${recording.id}`);
    });

    if (refreshPromises?.length) {
      await Promise.all(refreshPromises);
    }

    return { success: true, message: `Processed media update for ${recordings?.length || 0} recordings` };
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
        // Extract notetaker_id and status from the nested structure
        const notetakerId = webhookData.data?.data?.object?.notetaker_id;
        const mediaStatus = webhookData.data?.data?.object?.status;
        
        if (!notetakerId) {
          console.error('❌ Missing notetaker_id in media_updated webhook');
          return { 
            success: false, 
            message: 'Missing notetaker_id in webhook data' 
          };
        }

        const mediaResult = await handleNotetakerMediaUpdated(notetakerId, mediaStatus);
        logWebhookSuccess(webhookData.type);
        return { success: true, result: mediaResult };

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