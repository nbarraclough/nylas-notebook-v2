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
  return new Date(Number(timestamp) * 1000).toISOString();
};

export async function handleWebhookType(webhookData: NylasWebhookPayload, grantId: string, requestId: string) {
  console.log(`🎯 [${requestId}] Processing webhook type: ${webhookData.type}`);

  try {
    // Extract grant ID from the correct location in the webhook payload
    const eventGrant = webhookData.data?.object?.grant_id;
    const effectiveGrantId = grantId || eventGrant;

    console.log(`📝 [${requestId}] Using grant ID:`, effectiveGrantId);

    switch (webhookData.type) {
      case 'grant.created': {
        console.log(`📝 [${requestId}] Processing grant created:`, effectiveGrantId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .update({ nylas_grant_id: effectiveGrantId })
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
        console.log(`📝 [${requestId}] Processing grant ${webhookData.type}:`, effectiveGrantId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .update({ nylas_grant_id: null })
          .eq('nylas_grant_id', effectiveGrantId)
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
        
        const { data: event, error: eventError } = await supabase
          .from('events')
          .upsert({
            user_id: profile.id,
            nylas_event_id: eventData.id,
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
        
        // Find user associated with this grant
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

      case 'notetaker.media_updated': {
        const { status, notetaker_id } = webhookData.data.object;
        console.log(`📝 [${requestId}] Processing notetaker media update:`, { status, notetaker_id });

        // First update the recording status as before
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

        // If status is media_available, trigger media retrieval using direct fetch
        if (status === 'media_available' && recording) {
          console.log(`🎥 [${requestId}] Media available, triggering retrieval for recording:`, recording.id);
          
          try {
            const functionUrl = `${supabaseUrl}/functions/v1/get-recording-media`;
            console.log(`🔄 [${requestId}] Calling edge function:`, functionUrl);

            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                recordingId: recording.id,
                notetakerId: notetaker_id
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ [${requestId}] Error response from get-recording-media:`, {
                status: response.status,
                statusText: response.statusText,
                error: errorText
              });
              // Don't return error here - we've already updated the status successfully
            } else {
              const responseData = await response.json();
              console.log(`✅ [${requestId}] Successfully triggered media retrieval:`, responseData);
            }
          } catch (mediaError) {
            console.error(`❌ [${requestId}] Exception during media retrieval:`, mediaError);
            // Don't throw - we want to preserve the status update
          }
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