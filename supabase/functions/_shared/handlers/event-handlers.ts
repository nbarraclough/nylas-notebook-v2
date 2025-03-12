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

// Function to check if an event should be recorded based on recording rules
async function shouldRecordEvent(userId: string, event: any): Promise<boolean> {
  try {
    // Get user's recording preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('record_internal_meetings, record_external_meetings')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error(`❌ Error fetching user profile:`, profileError);
      return false;
    }
    
    // Check if this is a recurring event with specific settings
    if (event.master_event_id) {
      const { data: recurringSettings, error: recurringError } = await supabaseAdmin
        .from('recurring_recording_settings')
        .select('enabled')
        .eq('user_id', userId)
        .eq('master_event_id', event.master_event_id)
        .maybeSingle();
      
      if (!recurringError && recurringSettings?.enabled) {
        console.log(`📅 Recurring event has explicit recording enabled`);
        return true;
      }
    }
    
    // Get organizer domain
    const organizer = event.organizer ? event.organizer : {};
    const organizerDomain = organizer.email ? organizer.email.split('@')[1] : '';
    
    if (!organizerDomain) {
      console.log(`⚠️ No organizer domain found, defaulting to record`);
      return true;
    }
    
    // Determine if this is an internal meeting
    const participants = Array.isArray(event.participants) ? event.participants : [];
    const isInternal = participants.every(participant => {
      const participantEmail = participant.email || '';
      const participantDomain = participantEmail.split('@')[1] || '';
      return participantDomain === organizerDomain;
    });
    
    // Apply recording rules
    if (isInternal && profile.record_internal_meetings) {
      console.log(`📅 Internal meeting matches recording rules`);
      return true;
    } else if (!isInternal && profile.record_external_meetings) {
      console.log(`📅 External meeting matches recording rules`);
      return true;
    }
    
    console.log(`📅 Event does not match recording rules (internal: ${isInternal})`);
    return false;
  } catch (error) {
    console.error(`❌ Error in shouldRecordEvent:`, error);
    return false;
  }
}

// Function to create a notetaker for an event
async function createNotetakerForEvent(
  userId: string, 
  eventId: string, 
  grantId: string, 
  meetingUrl: string, 
  joinTimeUnix?: number
): Promise<any> {
  if (!meetingUrl) {
    console.log(`⚠️ No meeting URL found for event ${eventId}, cannot create notetaker`);
    return null;
  }

  try {
    console.log(`🔄 Creating notetaker for event ${eventId} with URL ${meetingUrl}`);
    if (joinTimeUnix) {
      console.log(`⏰ Notetaker scheduled to join at timestamp: ${joinTimeUnix} (${new Date(joinTimeUnix * 1000).toISOString()})`);
    } else {
      console.log(`⏰ No join time specified, notetaker will join immediately`);
    }
    
    // Get user's notetaker name preference - fixed to use !inner for proper join
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('notetaker_name')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error(`❌ Error fetching user profile:`, profileError);
      return null;
    }
    
    const notetakerName = profile.notetaker_name || 'Nylas Notetaker';
    console.log(`👤 Using notetaker name: "${notetakerName}" from user profile`);
    
    // Prepare request payload - now including join_time if provided
    const requestPayload: Record<string, any> = {
      meeting_link: meetingUrl,
      notetaker_name: notetakerName
    };
    
    // Add join_time to payload if provided
    if (joinTimeUnix) {
      requestPayload.join_time = joinTimeUnix;
    }
    
    console.log(`📝 Nylas API request payload:`, requestPayload);
    
    // Call Nylas API to create notetaker
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/gzip'
        },
        body: JSON.stringify(requestPayload)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Nylas API error (${response.status}):`, errorText);
      return null;
    }
    
    const nylasResponse = await response.json();
    const notetakerId = nylasResponse.data.id;
    console.log(`✅ Successfully created notetaker ${notetakerId} for event ${eventId}`);
    
    // Convert Unix timestamp to ISO string for database storage if provided
    const joinTimeIso = joinTimeUnix ? new Date(joinTimeUnix * 1000).toISOString() : null;
    
    // Create recording entry with join_time if available
    const recordingData = {
      user_id: userId,
      event_id: eventId,
      notetaker_id: notetakerId,
      recording_url: '',
      status: 'waiting',
      updated_at: new Date().toISOString()
    };
    
    // Add join_time to recording data if available
    if (joinTimeIso) {
      Object.assign(recordingData, { join_time: joinTimeIso });
      console.log(`⏰ Storing join time in recording: ${joinTimeIso}`);
    }
    
    const { error: recordingError } = await supabaseAdmin
      .from('recordings')
      .upsert(recordingData, {
        onConflict: 'notetaker_id',
        ignoreDuplicates: false
      });
      
    if (recordingError) {
      console.error(`❌ Error creating recording entry:`, recordingError);
      return null;
    }
    
    return notetakerId;
  } catch (error) {
    console.error(`❌ Error in createNotetakerForEvent:`, error);
    return null;
  }
}

// Updated function to update notetaker join time
async function updateNotetakerJoinTime(grantId: string, notetakerId: string, newJoinTime: number) {
  try {
    console.log(`🔄 Updating notetaker ${notetakerId} join time to ${newJoinTime} seconds (${new Date(newJoinTime * 1000).toISOString()})`);
    
    const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET') ?? '';
    if (!nylasApiKey) {
      throw new Error('NYLAS_CLIENT_SECRET not set');
    }
    
    // Ensure newJoinTime is in seconds for Nylas API
    // If it's already in seconds (less than year 2100 in seconds), use as is
    // Otherwise convert from milliseconds to seconds
    const joinTimeInSeconds = newJoinTime < 4102444800 ? newJoinTime : Math.floor(newJoinTime / 1000);
    
    console.log(`⏰ Using join time in seconds: ${joinTimeInSeconds} (${new Date(joinTimeInSeconds * 1000).toISOString()})`);
    
    // Find the user associated with this grant to get the notetaker name
    const profile = await findUserByGrant(grantId);
    if (!profile) {
      throw new Error(`No user found for grant: ${grantId}`);
    }
    
    // Get the user's preferred notetaker name
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('notetaker_name')
      .eq('id', profile.id)
      .single();
      
    if (profileError) {
      console.error(`❌ Error fetching user profile:`, profileError);
      throw profileError;
    }
    
    // Use the user's preferred name or default to "Nylas Notetaker"
    const notetakerName = userProfile.notetaker_name || 'Nylas Notetaker';
    
    // Prepare the complete payload with all required fields
    const payload = {
      join_time: joinTimeInSeconds,
      notetaker_name: notetakerName,
      meeting_settings: {
        video_recording: true,
        audio_recording: true,
        transcription: true
      }
    };
    
    console.log(`📤 Sending complete payload to Nylas API:`, payload);
    
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${nylasApiKey}`,
          'Accept': 'application/json, application/gzip',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );
    
    // Enhanced error handling
    if (!response.ok) {
      // Try to get detailed error information
      let errorDetail = "";
      try {
        const errorResponse = await response.json();
        errorDetail = JSON.stringify(errorResponse);
      } catch (e) {
        errorDetail = await response.text();
      }
      
      const errorMessage = `Nylas API error (${response.status}): ${errorDetail}`;
      console.error(`❌ ${errorMessage}`);
      
      if (response.status === 500) {
        console.error(`❌ Nylas server error. This may be temporary, consider implementing retries.`);
      } else if (response.status === 404) {
        console.error(`❌ Notetaker not found. It may have been deleted or cancelled.`);
      } else if (response.status === 400) {
        console.error(`❌ Bad request. Check the payload format and required fields.`);
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log(`✅ Successfully updated notetaker join time:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error updating notetaker join time:`, error);
    throw error;
  }
}

// New function to cancel a notetaker via Nylas API
async function cancelNotetaker(grantId: string, notetakerId: string) {
  try {
    console.log(`🔄 Cancelling notetaker ${notetakerId} for grant ${grantId}`);
    
    const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET') ?? '';
    if (!nylasApiKey) {
      throw new Error('NYLAS_CLIENT_SECRET not set');
    }
    
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/cancel`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${nylasApiKey}`,
          'Accept': 'application/json, application/gzip'
        }
      }
    );
    
    // Log the response status for debugging
    console.log(`📥 Nylas API Response Status for cancel: ${response.status}`);
    
    // Even if the response is not OK, we want to log and continue
    // This could happen if the notetaker was already cancelled
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ Non-OK response from Nylas API (${response.status}): ${errorText}`);
      // Not throwing an error here as we want to continue with deletion
    }
    
    return response.status;
  } catch (error) {
    console.error(`❌ Error cancelling notetaker:`, error);
    // Log but don't throw, we still want to continue with deletion
    return null;
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
      
      // For recurring events, we'll let the recurring event processor handle recording logic
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
      const { data: eventRecord, error: eventError } = await supabaseAdmin
        .from('events')
        .upsert(eventData, {
          onConflict: 'nylas_event_id,user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (eventError) {
        logWebhookError('event.created', eventError);
        return { success: false, error: eventError };
      }
      
      // Now check if this event should have a notetaker based on recording rules
      const shouldRecord = await shouldRecordEvent(profile.id, processedData);
      
      if (shouldRecord && processedData.conference_url) {
        console.log(`🔄 Event ${objectData.id} meets recording criteria, creating notetaker`);
        
        // Extract the start time from the event data if available
        // objectData.when.start_time is already in Unix timestamp format (seconds)
        const joinTimeUnix = objectData.when.start_time || null;
        
        if (joinTimeUnix) {
          console.log(`⏰ Event start time found: ${joinTimeUnix} (${new Date(joinTimeUnix * 1000).toISOString()})`);
        } else {
          console.log(`⚠️ No event start time found, notetaker will join immediately`);
        }
        
        const notetakerId = await createNotetakerForEvent(
          profile.id, 
          eventRecord.id, 
          grantId, 
          processedData.conference_url,
          joinTimeUnix
        );
        
        if (notetakerId) {
          console.log(`✅ Successfully scheduled notetaker ${notetakerId} for event ${objectData.id}`);
        }
      } else {
        console.log(`ℹ️ Event ${objectData.id} does not need a notetaker (shouldRecord: ${shouldRecord}, has URL: ${!!processedData.conference_url})`);
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
      console.log(`📅 Event start time changed for event ${objectData.id}:`, {
        oldTime: existingEvent.start_time,
        newTime: newStartTime,
        unixTime: objectData.when.start_time
      });
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

      // The critical fix - handle the result properly, ensuring it's always a valid object
      if (!result) {
        const error = new Error('Failed to process recurring event (undefined result)');
        logWebhookError('event.updated', error);
        return { success: false, message: error.message };
      }

      if (!result.success) {
        const error = new Error(result.message || 'Unknown error processing recurring event');
        logWebhookError('event.updated', error);
        return { success: false, message: error.message };
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
        .not('notetaker_id', 'is', null)
        .maybeSingle();
      
      if (recordingError) {
        logWebhookError('event.updated', recordingError);
        console.error(`❌ Error finding recording for event ${existingEvent.id}:`, recordingError);
      } else if (activeRecording && activeRecording.notetaker_id) {
        console.log(`🔄 Found active recording ${activeRecording.id} with notetaker ${activeRecording.notetaker_id} to update`);
        
        try {
          // Pass the Unix timestamp in seconds to updateNotetakerJoinTime
          const newJoinTimeUnix = objectData.when.start_time;
          console.log(`⏰ Updating notetaker to join at Unix timestamp:`, {
            seconds: newJoinTimeUnix,
            iso: new Date(newJoinTimeUnix * 1000).toISOString()
          });
          
          // Update the notetaker join time via Nylas API
          await updateNotetakerJoinTime(grantId, activeRecording.notetaker_id, newJoinTimeUnix);
          
          // Update our recording with the new join time (in ISO format)
          await supabaseAdmin
            .from('recordings')
            .update({
              join_time: new Date(newJoinTimeUnix * 1000).toISOString(),
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

    // Check for active recordings with notetakers for this event
    console.log(`🔍 Finding recordings with notetakers for event ${objectData.id}`);
    const { data: recordings, error: recordingsError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        recordings (
          id,
          notetaker_id,
          status
        )
      `)
      .eq('nylas_event_id', objectData.id)
      .eq('user_id', profile.id)
      .single();

    if (recordingsError) {
      logWebhookError('event.deleted', recordingsError);
      console.error(`❌ Error fetching recordings for event ${objectData.id}:`, recordingsError);
    } else if (recordings && recordings.recordings && recordings.recordings.length > 0) {
      // Process each recording with a notetaker
      for (const recording of recordings.recordings) {
        if (recording.notetaker_id) {
          console.log(`📝 Found recording ${recording.id} with notetaker ${recording.notetaker_id} to cancel`);
          
          try {
            // Cancel the notetaker via Nylas API
            await cancelNotetaker(grantId, recording.notetaker_id);
            
            // Update recording status to cancelled
            const { error: updateError } = await supabaseAdmin
              .from('recordings')
              .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString()
              })
              .eq('id', recording.id);
              
            if (updateError) {
              console.error(`❌ Error updating recording ${recording.id} status:`, updateError);
            } else {
              console.log(`✅ Successfully updated recording ${recording.id} status to cancelled`);
            }
          } catch (cancelError) {
            console.error(`❌ Error in cancel process for notetaker ${recording.notetaker_id}:`, cancelError);
            // Continue with deletion even if cancellation fails
          }
        }
      }
    } else {
      console.log(`ℹ️ No active recordings with notetakers found for event ${objectData.id}`);
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
