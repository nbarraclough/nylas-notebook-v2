
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { findUserByGrant } from './user-handlers.ts';
import { logWebhookProcessing, logWebhookError, logWebhookSuccess } from '../webhook-logger.ts';
import { processRecurringEvent } from '../recurring-event-utils.ts';

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
