
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { findUserByGrant } from './user-handlers.ts';
import { logWebhookProcessing, logWebhookError, logWebhookSuccess } from '../webhook-logger.ts';
import { processRecurringEvent } from '../recurring-event-utils.ts';
import { unixSecondsToISOString } from '../timestamp-utils.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper to process event data without text_description field
function processEventData(objectData: any) {
  return {
    title: objectData.title || 'Untitled Event',
    description: objectData.description,
    location: objectData.location,
    start_time: objectData.when.start_time ? new Date(objectData.when.start_time * 1000).toISOString() : null,
    end_time: objectData.when.end_time ? new Date(objectData.when.end_time * 1000).toISOString() : null,
    participants: objectData.participants || [],
    conference_url: objectData.conferencing?.details?.url,
    ical_uid: objectData.ical_uid,
    busy: objectData.busy !== false,
    html_link: objectData.html_link,
    master_event_id: objectData.master_event_id,
    organizer: objectData.organizer || {},
    resources: objectData.resources || [],
    read_only: objectData.read_only || false,
    reminders: objectData.reminders || {},
    recurrence: objectData.recurrence,
    status: objectData.status,
    visibility: objectData.visibility || 'default',
    original_start_time: objectData.original_start_time ? 
      new Date(objectData.original_start_time * 1000).toISOString() : null
  };
}

// New function to update notetaker join time
async function updateNotetakerJoinTime(grantId: string, notetakerId: string, newJoinTime: number) {
  try {
    console.log(`🔄 Updating notetaker ${notetakerId} join time to ${newJoinTime}`);
    
    const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET') ?? '';
    if (!nylasApiKey) {
      throw new Error('NYLAS_CLIENT_SECRET not set');
    }
    
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${nylasApiKey}`,
          'Accept': 'application/json, application/gzip',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          join_time: newJoinTime
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nylas API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error updating notetaker join time:`, error);
    throw error;
  }
}

export const handleEventCreated = async (objectData: any, grantId: string) => {
  logWebhookProcessing('event.created', { eventId: objectData.id, grantId });
  
  try {
    // Find user associated with this grant
    const profile = await findUserByGrant(grantId);
    if (!profile) {
      const error = new Error(`No user found for grant: ${grantId}`);
      logWebhookError('event.created', error);
      return { success: false, message: error.message };
    }

    // Check if this is a recurring event or instance
    if (objectData.recurrence || objectData.master_event_id) {
      console.log('Processing recurring event:', objectData.id);
      const result = await processRecurringEvent(
        objectData,
        profile.id,
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        crypto.randomUUID()
      );

      if (!result.success) {
        logWebhookError('event.created', new Error(result.message));
        return result;
      }
    } else {
      // Process regular event
      console.log('Processing regular event:', objectData.id);
      const processedData = processEventData(objectData);
      const eventData = {
        user_id: profile.id,
        nylas_event_id: objectData.id,
        ...processedData,
        last_updated_at: new Date().toISOString()
      };

      // Insert or update the event in our database using the constraint
      const { error: eventError } = await supabaseAdmin
        .from('events')
        .upsert(eventData, {
          onConflict: 'nylas_event_id,user_id',
          ignoreDuplicates: false
        });

      if (eventError) {
        logWebhookError('event.created', eventError);
        return { success: false, error: eventError };
      }
    }

    const result = { success: true, eventId: objectData.id };
    logWebhookSuccess('event.created', result);
    return result;
  } catch (error) {
    logWebhookError('event.created', error);
    return { success: false, error };
  }
};

export const handleEventUpdated = async (objectData: any, grantId: string) => {
  logWebhookProcessing('event.updated', { eventId: objectData.id, grantId });
  
  try {
    // Find user associated with this grant
    const profile = await findUserByGrant(grantId);
    if (!profile) {
      const error = new Error(`No user found for grant: ${grantId}`);
      logWebhookError('event.updated', error);
      return { success: false, message: error.message };
    }

    // Store the new start time for later comparison
    const newStartTime = objectData.when.start_time ? new Date(objectData.when.start_time * 1000).toISOString() : null;
    
    // Get the current event data to check if start time has changed
    const { data: existingEvent, error: eventFetchError } = await supabaseAdmin
      .from('events')
      .select('id, start_time')
      .eq('nylas_event_id', objectData.id)
      .eq('user_id', profile.id)
      .maybeSingle();
    
    if (eventFetchError) {
      logWebhookError('event.updated', eventFetchError);
      return { success: false, error: eventFetchError };
    }
    
    // Flag to check if start time has changed
    const startTimeChanged = existingEvent && newStartTime && existingEvent.start_time !== newStartTime;
    
    if (startTimeChanged) {
      console.log(`📅 Event start time changed for event ${objectData.id}. Old: ${existingEvent.start_time}, New: ${newStartTime}`);
    }

    // Check if this is a recurring event or instance
    if (objectData.recurrence || objectData.master_event_id) {
      console.log('Processing recurring event update:', objectData.id);
      const result = await processRecurringEvent(
        objectData,
        profile.id,
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        crypto.randomUUID()
      );

      if (!result.success) {
        logWebhookError('event.updated', new Error(result.message));
        return result;
      }
    } else {
      // Process regular event update
      console.log('Processing regular event update:', objectData.id);
      const processedData = processEventData(objectData);
      const eventData = {
        user_id: profile.id,
        nylas_event_id: objectData.id,
        ...processedData,
        last_updated_at: new Date().toISOString()
      };

      const { error: eventError } = await supabaseAdmin
        .from('events')
        .upsert(eventData, {
          onConflict: 'nylas_event_id,user_id',
          ignoreDuplicates: false
        });

      if (eventError) {
        logWebhookError('event.updated', eventError);
        return { success: false, error: eventError };
      }
    }
    
    // If start time changed, update any associated notetaker's join time
    if (startTimeChanged && existingEvent) {
      // Check if there's an active recording for this event
      const { data: activeRecording, error: recordingError } = await supabaseAdmin
        .from('recordings')
        .select('id, notetaker_id, status')
        .eq('event_id', existingEvent.id)
        .eq('user_id', profile.id)
        .in('status', ['waiting', 'joining'])
        .not('notetaker_id', 'is', null)
        .maybeSingle();
      
      if (recordingError) {
        logWebhookError('event.updated', recordingError);
        console.error(`❌ Error finding recording for event ${existingEvent.id}:`, recordingError);
      } else if (activeRecording && activeRecording.notetaker_id) {
        console.log(`🔄 Found active recording ${activeRecording.id} with notetaker ${activeRecording.notetaker_id} to update`);
        
        try {
          // Convert ISO timestamp to Unix timestamp (seconds)
          const newJoinTimeUnix = Math.floor(new Date(newStartTime).getTime() / 1000);
          
          // Update the notetaker join time via Nylas API
          await updateNotetakerJoinTime(grantId, activeRecording.notetaker_id, newJoinTimeUnix);
          
          // Update our recording with the new join time
          await supabaseAdmin
            .from('recordings')
            .update({
              join_time: newStartTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRecording.id);
            
          console.log(`✅ Successfully updated join time for recording ${activeRecording.id} to ${newStartTime}`);
        } catch (updateError) {
          console.error(`❌ Error updating notetaker join time:`, updateError);
          logWebhookError('event.updated', updateError);
        }
      } else {
        console.log(`ℹ️ No active recording found for event ${existingEvent.id} that needs join time update`);
      }
    }

    const result = { success: true, eventId: objectData.id };
    logWebhookSuccess('event.updated', result);
    return result;
  } catch (error) {
    logWebhookError('event.updated', error);
    return { success: false, error };
  }
};

export const handleEventDeleted = async (objectData: any, grantId: string) => {
  logWebhookProcessing('event.deleted', { eventId: objectData.id, grantId });
  
  try {
    // Find user associated with this grant
    const profile = await findUserByGrant(grantId);
    if (!profile) {
      const error = new Error(`No user found for grant: ${grantId}`);
      logWebhookError('event.deleted', error);
      return { success: false, message: 'Profile not found' };
    }

    // If this is a recurring master event, delete all instances too
    if (objectData.recurrence) {
      console.log('Deleting recurring master event and all instances:', objectData.id);
      
      // Delete all instances that reference this master event
      const { error: instancesError } = await supabaseAdmin
        .from('events')
        .delete()
        .eq('master_event_id', objectData.id);

      if (instancesError) {
        logWebhookError('event.deleted', instancesError);
        return { success: false, message: instancesError.message };
      }
    }

    // Delete the event itself (whether it's a regular event, master event, or instance)
    const { error: eventError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('nylas_event_id', objectData.id)
      .eq('user_id', profile.id);

    if (eventError) {
      logWebhookError('event.deleted', eventError);
      return { success: false, message: eventError.message };
    }

    const result = { success: true, eventId: objectData.id };
    logWebhookSuccess('event.deleted', result);
    return result;
  } catch (error) {
    logWebhookError('event.deleted', error);
    return { success: false, error };
  }
};
