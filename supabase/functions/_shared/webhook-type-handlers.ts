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
        
        const { id: notetakerId, status } = webhookData.data.object;
        
        if (!notetakerId) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // Update recording with notetaker status
        const { error: recordingError } = await supabase
          .from('recordings')
          .update({ 
            notetaker_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('notetaker_id', notetakerId);

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully processed notetaker status webhook`);
        return { success: true, message: 'Notetaker status updated successfully' };
      }

      case 'notetaker.meeting_state': {
        console.log(`📝 [${requestId}] Processing notetaker meeting state:`, webhookData.data.object);
        
        const { id: notetakerId, meeting_state } = webhookData.data.object;
        
        if (!notetakerId) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // Update recording with meeting state
        const { error: recordingError } = await supabase
          .from('recordings')
          .update({ 
            meeting_state,
            updated_at: new Date().toISOString()
          })
          .eq('notetaker_id', notetakerId);

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully processed notetaker meeting state webhook`);
        return { success: true, message: 'Notetaker meeting state updated successfully' };
      }

      case 'notetaker.media': {
        console.log(`📝 [${requestId}] Processing notetaker media:`, webhookData.data.object);
        
        const { id: notetakerId, status, media } = webhookData.data.object;
        
        if (!notetakerId) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // Update recording with media status and URLs
        const updateData: any = {
          media_status: status,
          updated_at: new Date().toISOString()
        };

        if (media) {
          if (media.recording) {
            updateData.recording_url = media.recording;
          }
          if (media.transcript) {
            updateData.transcript_url = media.transcript;
          }
        }

        const { error: recordingError } = await supabase
          .from('recordings')
          .update(updateData)
          .eq('notetaker_id', notetakerId);

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully processed notetaker media webhook`);
        return { success: true, message: 'Notetaker media status updated successfully' };
      }

      case 'notetaker.updated': {
        console.log(`📝 [${requestId}] Processing notetaker updated:`, webhookData.data.object);
        
        const { id: notetakerId, status, event } = webhookData.data.object;
        
        if (!notetakerId) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // Update recording status based on notetaker status
        const { error: recordingError } = await supabase
          .from('recordings')
          .update({ 
            notetaker_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('notetaker_id', notetakerId);

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully processed notetaker updated webhook`);
        return { success: true, message: 'Notetaker status updated successfully' };
      }

      case 'notetaker.created': {
        console.log(`📝 [${requestId}] Processing notetaker created:`, webhookData.data.object);
        
        const { id: notetakerId, event } = webhookData.data.object;
        
        if (!notetakerId) {
          console.error(`❌ [${requestId}] No notetaker_id in webhook payload`);
          return { success: false, message: 'No notetaker_id in webhook payload' };
        }

        // If this is for a calendar event (not manual meeting)
        if (event?.event_id) {
          console.log(`📅 [${requestId}] Updating queue entry for event:`, event.event_id);
          
          // Update queue entry with notetaker_id
          const { error: queueError } = await supabase
            .from('notetaker_queue')
            .update({ 
              notetaker_id: notetakerId,
              status: 'sent',
              updated_at: new Date().toISOString()
            })
            .eq('event_id', event.event_id);

          if (queueError) {
            console.error(`❌ [${requestId}] Error updating queue entry:`, queueError);
            // Continue to update recording even if queue update fails
          }
        }

        // Update or create recording entry
        const { error: recordingError } = await supabase
          .from('recordings')
          .upsert({ 
            notetaker_id: notetakerId,
            status: 'waiting',
            updated_at: new Date().toISOString()
          })
          .eq('notetaker_id', notetakerId);

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully processed notetaker created webhook`);
        return { success: true, message: 'Notetaker created successfully' };
      }

      case 'event.created':
      case 'event.updated': {
        console.log(`📝 [${requestId}] Processing event ${webhookData.type}:`, webhookData.data.object.id);
        const eventData = webhookData.data.object;
        
        // Find all users associated with this grant
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('nylas_grant_id', effectiveGrantId);

        if (profileError) {
          console.error(`❌ [${requestId}] Error finding profiles for grant:`, profileError);
          return { success: false, message: profileError.message };
        }

        if (!profiles || profiles.length === 0) {
          console.error(`❌ [${requestId}] No profiles found for grant: ${effectiveGrantId}`);
          return { success: false, message: `No profiles found for grant: ${effectiveGrantId}` };
        }

        // Log if multiple profiles are found
        if (profiles.length > 1) {
          console.log(`ℹ️ [${requestId}] Multiple profiles found for grant ${effectiveGrantId}:`, 
            profiles.map(p => p.email).join(', ')
          );
        }

        // Process event for each profile
        const results = await Promise.all(
          profiles.map(profile => 
            processEventData(eventData, profile.id, `${requestId}-${profile.id}`)
          )
        );

        // Check if any processing failed
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          console.error(`❌ [${requestId}] Error processing event for some users:`, failures);
          return { 
            success: false, 
            message: 'Event processing failed for some users',
            details: failures 
          };
        }

        console.log(`✅ [${requestId}] Successfully processed event for ${profiles.length} users`);
        return { 
          success: true, 
          message: `Event processed successfully for ${profiles.length} users` 
        };
      }

      case 'event.deleted': {
        console.log(`📝 [${requestId}] Processing event deleted:`, webhookData.data.object.id);
        
        // Find all users associated with this grant
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('nylas_grant_id', effectiveGrantId);

        if (profileError) {
          console.error(`❌ [${requestId}] Error finding profiles:`, profileError);
          return { success: false, message: profileError.message };
        }

        if (!profiles || profiles.length === 0) {
          console.error(`❌ [${requestId}] No profiles found for grant: ${effectiveGrantId}`);
          return { success: false, message: 'Profile not found' };
        }

        // Log if multiple profiles are found
        if (profiles.length > 1) {
          console.log(`ℹ️ [${requestId}] Deleting event for multiple profiles with grant ${effectiveGrantId}:`, 
            profiles.map(p => p.email).join(', ')
          );
        }

        // Delete event for all affected users
        const { error: eventError } = await supabase
          .from('events')
          .delete()
          .eq('nylas_event_id', webhookData.data.object.id)
          .in('user_id', profiles.map(p => p.id));

        if (eventError) {
          console.error(`❌ [${requestId}] Error deleting event:`, eventError);
          return { success: false, message: eventError.message };
        }

        console.log(`✅ [${requestId}] Successfully deleted event for ${profiles.length} users`);
        return { 
          success: true, 
          message: `Event deleted for ${profiles.length} users` 
        };
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
