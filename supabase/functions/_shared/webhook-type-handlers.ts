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
