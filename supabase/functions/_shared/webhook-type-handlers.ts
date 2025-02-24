
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

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
      case 'event.updated':
      case 'event.deleted':
        return await handleEventWebhook(webhookData, grantId, requestId);
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

async function handleEventWebhook(webhookData: any, grantId: string, requestId: string) {
  try {
    // Get the user_id from the grant
    const { data: userId, error: userError } = await supabase
      .rpc('get_user_id_from_grant', { grant_id_param: grantId });

    if (userError) {
      console.error(`❌ [${requestId}] Error getting user_id:`, userError);
      throw userError;
    }

    if (!userId) {
      console.error(`❌ [${requestId}] No profiles found for grant:`, grantId);
      return null;
    }

    const eventData = webhookData.data.object;
    console.log(`📝 [${requestId}] Processing event ${webhookData.type}: ${eventData.id}`);

    if (webhookData.type === 'event.deleted') {
      await handleEventDeletion(eventData.id, userId, requestId);
      return { eventId: null }; // Event was deleted
    } else {
      const eventId = await handleEventUpsert(eventData, userId, requestId);
      return { eventId };
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleEventWebhook:`, error);
    throw error;
  }
}

async function handleEventUpsert(eventData: any, userId: string, requestId: string) {
  try {
    const eventRecord = {
      user_id: userId,
      nylas_event_id: eventData.id,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start_time: eventData.when.start_time ? new Date(eventData.when.start_time * 1000).toISOString() : null,
      end_time: eventData.when.end_time ? new Date(eventData.when.end_time * 1000).toISOString() : null,
      participants: eventData.participants || [],
      conference_url: eventData.conferencing?.url || null,
      busy: eventData.busy,
      status: eventData.status,
      html_link: eventData.html_link,
      ical_uid: eventData.ical_uid,
      organizer: eventData.organizer || {},
      recurrence: eventData.recurrence,
      master_event_id: eventData.master_event_id,
      original_start_time: eventData.original_start_time ? new Date(eventData.original_start_time * 1000).toISOString() : null,
      last_updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('events')
      .upsert(eventRecord, {
        onConflict: 'nylas_event_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ [${requestId}] Error upserting event:`, error);
      throw error;
    }

    console.log(`✅ [${requestId}] Successfully processed event ${eventData.id}`);
    return data.id;
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleEventUpsert:`, error);
    throw error;
  }
}

async function handleEventDeletion(eventId: string, userId: string, requestId: string) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('nylas_event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error(`❌ [${requestId}] Error deleting event:`, error);
      throw error;
    }

    console.log(`✅ [${requestId}] Successfully deleted event ${eventId}`);
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleEventDeletion:`, error);
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
      .update({ notetaker_status: newStatus })
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
    const mediaStatus = webhookData.data.object.media_status;

    console.log(`📝 [${requestId}] Processing notetaker media update:`, { notetakerId, mediaStatus });

    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .update({ media_status: mediaStatus })
      .eq('notetaker_id', notetakerId)
      .select()
      .maybeSingle();

    if (recordingError) {
      console.error(`❌ [${requestId}] Error updating recording media status:`, recordingError);
      throw recordingError;
    }

    if (!recording) {
      console.log(`⚠️ [${requestId}] No recording found for notetaker ${notetakerId}`);
      return null;
    }

    console.log(`✅ [${requestId}] Updated recording ${recording.id} media status to ${mediaStatus}`);
    return { recordingId: recording.id };
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleNotetakerMediaWebhook:`, error);
    throw error;
  }
}
