import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from './cors.ts';
import { NylasWebhookPayload } from './types.ts';
import { processEventData } from './event-utils.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function handleWebhookType(webhookData: NylasWebhookPayload, grantId: string, requestId: string) {
  console.log(`🎯 [${requestId}] Processing webhook type: ${webhookData.type}`);

  try {
    const eventGrant = webhookData.data?.object?.grant_id;
    const effectiveGrantId = grantId || eventGrant;

    console.log(`📝 [${requestId}] Using grant ID:`, effectiveGrantId);

    switch (webhookData.type) {
      case 'notetaker.status_updated': {
        console.log(`📝 [${requestId}] Processing notetaker status update:`, webhookData.data.object);
        
        const { status, notetaker_id } = webhookData.data.object;
        
        if (!notetaker_id) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // Update queue entries with this notetaker_id
        const { error: queueError } = await supabase
          .from('notetaker_queue')
          .update({ 
            status: status === 'concluded' ? 'completed' : status,
            updated_at: new Date().toISOString()
          })
          .eq('notetaker_id', notetaker_id);

        if (queueError) {
          console.error(`❌ [${requestId}] Error updating queue entries:`, queueError);
          return { success: false, message: queueError.message };
        }

        // Update recording status if it exists
        const { error: recordingError } = await supabase
          .from('recordings')
          .update({ 
            notetaker_status: status,
            status: status === 'concluded' ? 'completed' : 'recording',
            updated_at: new Date().toISOString()
          })
          .eq('notetaker_id', notetaker_id);

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully processed notetaker status update`);
        return { success: true, message: 'Notetaker status updated successfully' };
      }

      case 'notetaker.media_updated': {
        console.log(`📝 [${requestId}] Processing media update:`, webhookData.data.object);
        
        const { status, notetaker_id } = webhookData.data.object;
        
        if (!notetaker_id) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // Find recordings with this notetaker_id
        const { data: recordings, error: fetchError } = await supabase
          .from('recordings')
          .select('id, user_id')
          .eq('notetaker_id', notetaker_id)
          .eq('status', 'recording');

        if (fetchError) {
          console.error(`❌ [${requestId}] Error fetching recordings:`, fetchError);
          return { success: false, message: fetchError.message };
        }

        if (!recordings || recordings.length === 0) {
          console.log(`ℹ️ [${requestId}] No recordings found for notetaker_id:`, notetaker_id);
          return { success: true, message: 'No recordings to update' };
        }

        if (status === 'media_available') {
          console.log(`📝 [${requestId}] Media available for recordings:`, recordings.map(r => r.id));
          
          // Update recordings to retrieving status
          const { error: updateError } = await supabase
            .from('recordings')
            .update({ 
              status: 'retrieving',
              updated_at: new Date().toISOString()
            })
            .eq('notetaker_id', notetaker_id);

          if (updateError) {
            console.error(`❌ [${requestId}] Error updating recordings:`, updateError);
            return { success: false, message: updateError.message };
          }

          // Trigger get-recording-media for each recording
          for (const recording of recordings) {
            try {
              console.log(`📝 [${requestId}] Triggering media retrieval for recording:`, recording.id);
              
              const { error } = await supabase.functions.invoke('get-recording-media', {
                body: { 
                  recordingId: recording.id,
                  notetakerId: notetaker_id
                },
              });

              if (error) {
                console.error(`❌ [${requestId}] Error triggering media retrieval:`, error);
                // Continue with other recordings even if one fails
                continue;
              }
            } catch (error) {
              console.error(`❌ [${requestId}] Error invoking get-recording-media:`, error);
              // Continue with other recordings even if one fails
              continue;
            }
          }
        } else if (status === 'processing') {
          // Update recordings to processing status
          const { error: updateError } = await supabase
            .from('recordings')
            .update({ 
              status: 'processing',
              updated_at: new Date().toISOString()
            })
            .eq('notetaker_id', notetaker_id);

          if (updateError) {
            console.error(`❌ [${requestId}] Error updating recordings:`, updateError);
            return { success: false, message: updateError.message };
          }
        }

        console.log(`✅ [${requestId}] Successfully processed media update`);
        return { success: true, message: 'Media update processed successfully' };
      }

      case 'event.created':
      case 'event.updated': {
        console.log(`📝 [${requestId}] Processing event ${webhookData.type}:`, webhookData.data.object.id);
        const eventData = webhookData.data.object;
        
        // Find user associated with this grant
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('nylas_grant_id', effectiveGrantId)
          .maybeSingle();

        if (profileError) {
          console.error(`❌ [${requestId}] Error finding profile for grant:`, profileError);
          return { success: false, message: profileError.message };
        }

        if (!profile) {
          console.error(`❌ [${requestId}] No profile found for grant: ${effectiveGrantId}`);
          return { success: false, message: `No profile found for grant: ${effectiveGrantId}` };
        }

        // Process the event data
        const result = await processEventData(eventData, profile.id, requestId);

        if (!result.success) {
          console.error(`❌ [${requestId}] Error processing event:`, result.message);
          return { success: false, message: result.message };
        }

        console.log(`✅ [${requestId}] Successfully processed event:`, result);
        return { success: true, message: 'Event processed successfully' };
      }

      case 'event.deleted': {
        console.log(`📝 [${requestId}] Processing event deleted:`, webhookData.data.object.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('nylas_grant_id', effectiveGrantId)
          .maybeSingle();

        if (profileError) {
          console.error(`❌ [${requestId}] Error finding profile:`, profileError);
          return { success: false, message: profileError.message };
        }

        if (!profile) {
          console.error(`❌ [${requestId}] No profile found for grant: ${effectiveGrantId}`);
          return { success: false, message: 'Profile not found' };
        }

        const { error: eventError } = await supabase
          .from('events')
          .delete()
          .eq('nylas_event_id', webhookData.data.object.id)
          .eq('user_id', profile.id);

        if (eventError) {
          console.error(`❌ [${requestId}] Error deleting event:`, eventError);
          return { success: false, message: eventError.message };
        }

        console.log(`✅ [${requestId}] Successfully deleted event`);
        return { success: true, message: 'Event deleted' };
      }

      case 'grant.created': {
        console.log(`📝 [${requestId}] Processing grant created:`, webhookData.data.object);
        const { error } = await supabase
          .from('profiles')
          .update({ 
            grant_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('nylas_grant_id', effectiveGrantId);

        if (error) {
          console.error(`❌ [${requestId}] Error updating grant status:`, error);
          return { success: false, message: error.message };
        }

        console.log(`✅ [${requestId}] Successfully processed grant creation`);
        return { success: true, message: 'Grant created successfully' };
      }

      case 'grant.updated': {
        console.log(`📝 [${requestId}] Processing grant updated:`, webhookData.data.object);
        const { error } = await supabase
          .from('profiles')
          .update({ 
            grant_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('nylas_grant_id', effectiveGrantId);

        if (error) {
          console.error(`❌ [${requestId}] Error updating grant status:`, error);
          return { success: false, message: error.message };
        }

        console.log(`✅ [${requestId}] Successfully processed grant update`);
        return { success: true, message: 'Grant updated successfully' };
      }

      case 'grant.deleted': {
        console.log(`📝 [${requestId}] Processing grant deleted:`, webhookData.data.object);
        const { error } = await supabase
          .from('profiles')
          .update({ 
            grant_status: 'revoked',
            updated_at: new Date().toISOString()
          })
          .eq('nylas_grant_id', effectiveGrantId);

        if (error) {
          console.error(`❌ [${requestId}] Error updating grant status:`, error);
          return { success: false, message: error.message };
        }

        console.log(`✅ [${requestId}] Successfully processed grant deletion`);
        return { success: true, message: 'Grant deleted successfully' };
      }

      case 'grant.expired': {
        console.log(`📝 [${requestId}] Processing grant expired:`, webhookData.data.object);
        const { error } = await supabase
          .from('profiles')
          .update({ 
            grant_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('nylas_grant_id', effectiveGrantId);

        if (error) {
          console.error(`❌ [${requestId}] Error updating grant status:`, error);
          return { success: false, message: error.message };
        }

        console.log(`✅ [${requestId}] Successfully processed grant expiration`);
        return { success: true, message: 'Grant expiration processed successfully' };
      }

      default:
        console.warn(`⚠️ [${requestId}] Unhandled webhook type:`, webhookData.type);
        return { success: false, message: `Unhandled webhook type: ${webhookData.type}` };
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing webhook:`, error);
    return { success: false, message: error.message };
  }
}
