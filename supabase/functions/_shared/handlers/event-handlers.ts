import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { findUserByGrant } from './user-handlers.ts';

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

export const handleEventCreated = async (objectData: any, grantId: string) => {
  console.log('Processing event.created:', objectData);
  
  // Find user associated with this grant
  const profile = await findUserByGrant(grantId);

  // Insert or update the event in our database
  const { error: eventError } = await supabaseAdmin
    .from('events')
    .upsert({
      user_id: profile.id,
      nylas_event_id: objectData.id,
      title: objectData.title,
      description: objectData.description,
      location: objectData.location,
      start_time: new Date(objectData.when.start_time * 1000).toISOString(),
      end_time: new Date(objectData.when.end_time * 1000).toISOString(),
      participants: objectData.participants,
      conference_url: objectData.conferencing?.details?.url,
      ical_uid: objectData.ical_uid,
      busy: objectData.busy,
      html_link: objectData.html_link,
      master_event_id: objectData.master_event_id,
      organizer: objectData.organizer,
      resources: objectData.resources,
      read_only: objectData.read_only,
      reminders: objectData.reminders,
      recurrence: objectData.recurrence,
      status: objectData.status,
      visibility: objectData.visibility,
      last_updated_at: new Date().toISOString()
    }, {
      onConflict: 'nylas_event_id'
    });

  if (eventError) {
    console.error('Error creating/updating event:', eventError);
    throw eventError;
  }

  console.log('Event created/updated successfully');
};

export const handleEventUpdated = async (objectData: any, grantId: string) => {
  console.log('Processing event.updated:', objectData);
  
  // Find user associated with this grant
  const profile = await findUserByGrant(grantId);

  // Check if we have this event
  const { data: existingEvent } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('nylas_event_id', objectData.id)
    .eq('user_id', profile.id)
    .maybeSingle();

  // Prepare event data
  const eventData = {
    user_id: profile.id,
    nylas_event_id: objectData.id,
    title: objectData.title,
    description: objectData.description,
    location: objectData.location,
    start_time: new Date(objectData.when.start_time * 1000).toISOString(),
    end_time: new Date(objectData.when.end_time * 1000).toISOString(),
    participants: objectData.participants,
    conference_url: objectData.conferencing?.details?.url,
    ical_uid: objectData.ical_uid,
    busy: objectData.busy,
    html_link: objectData.html_link,
    master_event_id: objectData.master_event_id,
    organizer: objectData.organizer,
    resources: objectData.resources,
    read_only: objectData.read_only,
    reminders: objectData.reminders,
    recurrence: objectData.recurrence,
    status: objectData.status,
    visibility: objectData.visibility,
    last_updated_at: new Date().toISOString()
  };

  // Insert or update based on whether we have the event
  const { error: eventError } = await supabaseAdmin
    .from('events')
    .upsert(eventData, {
      onConflict: 'nylas_event_id'
    });

  if (eventError) {
    console.error('Error updating event:', eventError);
    throw eventError;
  }

  console.log('Event updated successfully, trigger will handle queue status');
};

export const handleEventDeleted = async (objectData: any, grantId: string) => {
  if (!objectData?.id) {
    console.log('No event ID in deletion webhook, skipping');
    return;
  }

  console.log('Processing event.deleted:', objectData.id);

  // Find user associated with this grant
  const profile = await findUserByGrant(grantId);

  // Delete the event (cascade will handle queue items)
  const { error: deleteError } = await supabaseAdmin
    .from('events')
    .delete()
    .eq('nylas_event_id', objectData.id)
    .eq('user_id', profile.id);

  if (deleteError) {
    console.error('Error deleting event:', deleteError);
    throw deleteError;
  }

  console.log('Event and related queue items deleted successfully');
};