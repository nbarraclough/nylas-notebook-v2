import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { NylasWebhookPayload } from './types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const statusMapping = {
  joining: { status: 'joining', notetaker_status: 'joining' },
  waiting_for_admission: { status: 'waiting_for_admission', notetaker_status: 'waiting_for_admission' },
  failed_entry: { status: 'failed_entry', notetaker_status: 'failed_entry' },
  attending: { status: 'recording', notetaker_status: 'attending' },
  leaving: { status: 'leaving', notetaker_status: 'leaving' },
  concluded: { status: 'concluded', notetaker_status: 'concluded' },
};

const convertUnixTimestamp = (timestamp: number | null): string | null => {
  if (!timestamp) return null;
  // Convert Unix timestamp (seconds) to milliseconds and create ISO string
  return new Date(Number(timestamp) * 1000).toISOString();
};

export async function handleWebhookType(webhookData: NylasWebhookPayload, grantId: string, requestId: string) {
  console.log(`🎯 [${requestId}] Processing webhook type: ${webhookData.type}`);

  try {
    switch (webhookData.type) {
      case 'grant.created': {
        console.log(`📝 [${requestId}] Processing grant created:`, grantId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .update({ nylas_grant_id: grantId })
          .eq('id', webhookData.data.object.user_id)
          .select()
          .single();

        if (profileError) {
          console.error(`❌ [${requestId}] Error updating profile:`, profileError);
          return { success: false, message: profileError.message };
        }

        console.log(`✅ [${requestId}] Successfully updated profile with grant ID:`, profile);
        return { success: true, message: 'Grant ID updated' };
      }

      case 'grant.deleted':
      case 'grant.expired': {
        console.log(`📝 [${requestId}] Processing grant ${webhookData.type}:`, grantId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .update({ nylas_grant_id: null })
          .eq('nylas_grant_id', grantId)
          .select()
          .single();

        if (profileError) {
          console.error(`❌ [${requestId}] Error updating profile:`, profileError);
          return { success: false, message: profileError.message };
        }

        console.log(`✅ [${requestId}] Successfully removed grant ID from profile:`, profile);
        return { success: true, message: 'Grant ID removed' };
      }

      case 'event.created':
      case 'event.updated': {
        console.log(`📝 [${requestId}] Processing event ${webhookData.type}:`, webhookData.data.object.id);
        const eventData = webhookData.data.object;
        
        // Convert timestamps
        const startTime = convertUnixTimestamp(eventData.when.start_time);
        const endTime = convertUnixTimestamp(eventData.when.end_time);
        const originalStartTime = convertUnixTimestamp(eventData.original_start_time);
        const createdAt = convertUnixTimestamp(eventData.created_at);

        console.log(`🕒 [${requestId}] Converted timestamps:`, {
          startTime,
          endTime,
          originalStartTime,
          createdAt
        });
        
        // For upsert operations, we'll use the nylas_event_id to find the existing record
        // but let Postgres generate a new UUID if it's a new record
        const { data: event, error: eventError } = await supabase
          .from('events')
          .upsert({
            nylas_event_id: eventData.id,
            user_id: eventData.calendar_id,
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            start_time: startTime,
            end_time: endTime,
            participants: eventData.participants,
            status: eventData.status,
            busy: eventData.busy,
            read_only: eventData.read_only,
            created_at: createdAt,
            last_updated_at: new Date().toISOString(),
            original_start_time: originalStartTime,
            conference_url: eventData.conferencing?.details?.url || null,
            organizer: eventData.organizer || {},
            resources: eventData.resources || [],
            reminders: eventData.reminders || {},
            recurrence: eventData.recurrence || null,
            visibility: eventData.visibility || null,
            master_event_id: eventData.master_event_id || null,
            ical_uid: eventData.ical_uid || null,
            html_link: eventData.html_link || null
          }, {
            onConflict: 'nylas_event_id,user_id'
          })
          .select()
          .single();

        if (eventError) {
          console.error(`❌ [${requestId}] Error upserting event:`, eventError);
          return { success: false, message: eventError.message };
        }

        console.log(`✅ [${requestId}] Successfully upserted event:`, event);
        return { success: true, message: 'Event upserted' };
      }

      case 'event.deleted': {
        console.log(`📝 [${requestId}] Processing event deleted:`, webhookData.data.object.id);
        const { error: eventError } = await supabase
          .from('events')
          .delete()
          .eq('nylas_event_id', webhookData.data.object.id);

        if (eventError) {
          console.error(`❌ [${requestId}] Error deleting event:`, eventError);
          return { success: false, message: eventError.message };
        }

        console.log(`✅ [${requestId}] Successfully deleted event`);
        return { success: true, message: 'Event deleted' };
      }

      case 'notetaker.media_updated': {
        const { status, notetaker_id } = webhookData.data.object;
        console.log(`📝 [${requestId}] Processing notetaker media update:`, { status, notetaker_id });

        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .update({
            status: status === 'media_available' ? 'completed' : 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('notetaker_id', notetaker_id)
          .select()
          .single();

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully updated recording status:`, recording);
        return { success: true, message: 'Recording status updated' };
      }

      case 'notetaker.status_updated': {
        const { status, notetaker_id } = webhookData.data.object;
        console.log(`📝 [${requestId}] Processing notetaker status update:`, { status, notetaker_id });

        const mappedStatus = statusMapping[status as keyof typeof statusMapping];
        if (!mappedStatus) {
          console.error(`❌ [${requestId}] Unknown notetaker status:`, status);
          return { success: false, message: `Unknown notetaker status: ${status}` };
        }

        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .update({
            status: mappedStatus.status,
            notetaker_status: mappedStatus.notetaker_status,
            updated_at: new Date().toISOString(),
          })
          .eq('notetaker_id', notetaker_id)
          .select()
          .single();

        if (recordingError) {
          console.error(`❌ [${requestId}] Error updating recording:`, recordingError);
          return { success: false, message: recordingError.message };
        }

        console.log(`✅ [${requestId}] Successfully updated recording status:`, recording);
        return { success: true, message: 'Recording status updated' };
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