import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors';

interface WebhookData {
  type: string;
  data: {
    application_id: string;
    object: {
      notetaker_id?: string;
      status?: string;
    };
  };
}

export async function handleWebhookType(
  webhookData: WebhookData,
  requestId: string,
  supabaseClient: ReturnType<typeof createClient>
) {
  try {
    switch (webhookData.type) {
      case 'notetaker.media_updated':
        console.log(`📝 [${requestId}] Processing ${webhookData.type} webhook`);
        console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
        
        // Extract notetaker_id and status from the nested structure
        const notetakerId = webhookData.data?.object?.notetaker_id;
        const mediaStatus = webhookData.data?.object?.status;
        
        if (!notetakerId) {
          console.error('❌ Missing notetaker_id in media_updated webhook', webhookData);
          return { 
            success: false, 
            message: 'Missing notetaker_id in webhook data'
          };
        }

        // First check if a recording with this notetaker_id exists
        const { data: existingRecording, error: fetchError } = await supabaseClient
          .from('recordings')
          .select('id')
          .eq('notetaker_id', notetakerId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('❌ Error checking for existing recording:', fetchError);
          return {
            success: false,
            message: 'Error checking for existing recording'
          };
        }

        if (existingRecording) {
          // Update existing recording
          console.log(`📝 Updating existing recording for notetaker ${notetakerId}`);
          const { error: updateError } = await supabaseClient
            .from('recordings')
            .update({
              status: mediaStatus === 'media_available' ? 'completed' : 'processing',
              updated_at: new Date().toISOString()
            })
            .eq('notetaker_id', notetakerId);

          if (updateError) {
            console.error('❌ Error updating recording:', updateError);
            return {
              success: false,
              message: 'Error updating recording'
            };
          }
        } else {
          // Create new recording
          console.log(`📝 Creating new recording for notetaker ${notetakerId}`);
          const { error: insertError } = await supabaseClient
            .from('recordings')
            .insert({
              notetaker_id: notetakerId,
              status: mediaStatus === 'media_available' ? 'completed' : 'processing'
            });

          if (insertError) {
            console.error('❌ Error creating recording:', insertError);
            return {
              success: false,
              message: 'Error creating recording'
            };
          }
        }

        return {
          success: true,
          message: `Successfully processed media_updated webhook for notetaker ${notetakerId}`
        };

      default:
        console.log(`⚠️ [${requestId}] Unhandled webhook type: ${webhookData.type}`);
        return {
          success: false,
          message: `Unhandled webhook type: ${webhookData.type}`
        };
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}