import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { findUserByGrant } from './user-handlers.ts';
import { logWebhookProcessing, logWebhookError, logWebhookSuccess } from '../webhook-logger.ts';

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

const processEventData = (eventData: any) => {
  console.log('🔄 Processing event data:', JSON.stringify(eventData, null, 2));
  
  // Process participants, ensuring we include the organizer if they're a participant
  const allParticipants = eventData.participants || [];
  const organizer = eventData.organizer ? {
    email: eventData.organizer.email,
    name: eventData.organizer.name || eventData.organizer.email.split('@')[0]
  } : null;

  // Add organizer to participants if not already included
  if (organizer && !allParticipants.some(p => p.email === organizer.email)) {
    allParticipants.push({
      email: organizer.email,
      name: organizer.name,
      status: 'accepted'
    });
  }

  // Process all participants with consistent formatting
  const participants = allParticipants.map(p => ({
    email: p.email,
    name: p.name || p.email.split('@')[0],
    status: p.status || 'none'
  }));

  console.log('👥 Processed participants:', JSON.stringify(participants, null, 2));
  console.log('👤 Processed organizer:', JSON.stringify(organizer, null, 2));

  return {
    title: eventData.title || 'Untitled Event',
    description: eventData.description,
    location: eventData.location,
    start_time: eventData.when?.start_time ? new Date(eventData.when.start_time * 1000).toISOString() : null,
    end_time: eventData.when?.end_time ? new Date(eventData.when.end_time * 1000).toISOString() : null,
    participants,
    conference_url: eventData.conferencing?.details?.url || null,
    ical_uid: eventData.ical_uid,
    busy: eventData.busy !== false,
    html_link: eventData.html_link,
    master_event_id: eventData.master_event_id,
    organizer,
    resources: eventData.resources || [],
    read_only: eventData.read_only || false,
    reminders: eventData.reminders || {},
    recurrence: eventData.recurrence,
    status: eventData.status,
    visibility: eventData.visibility || 'default',
    original_start_time: eventData.original_start_time ? 
      new Date(eventData.original_start_time * 1000).toISOString() : null,
  };
};

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

    const processedData = processEventData(objectData);
    const eventData = {
      user_id: profile.id,
      nylas_event_id: objectData.id,
      ...processedData,
      last_updated_at: new Date().toISOString()
    };

    // Insert or update the event in our database using the new constraint
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

    const processedData = processEventData(objectData);
    const eventData = {
      user_id: profile.id,
      nylas_event_id: objectData.id,
      ...processedData,
      last_updated_at: new Date().toISOString()
    };

    // Update the event in our database using the new constraint
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
      return { success: false, message: error.message };
    }

    // Delete the event (cascade will handle queue items)
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('nylas_event_id', objectData.id)
      .eq('user_id', profile.id);

    if (deleteError) {
      logWebhookError('event.deleted', deleteError);
      return { success: false, error: deleteError };
    }

    const result = { success: true, eventId: objectData.id };
    logWebhookSuccess('event.deleted', result);
    return result;
  } catch (error) {
    logWebhookError('event.deleted', error);
    return { success: false, error };
  }
};
