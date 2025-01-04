import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { safeTimestampToISO } from './timestamp-utils.ts';

export const processEvent = async (
  event: any, 
  existingEventsMap: Map<string, Date>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>
) => {
  try {
    console.log('Processing event:', event.id, 'Raw event data:', JSON.stringify(event));

    // For events from database, use start_time/end_time directly
    // For events from Nylas API, use when object
    const startTime = event.when ? safeTimestampToISO(event.when.start_time) : event.start_time;
    const endTime = event.when ? safeTimestampToISO(event.when.end_time) : event.end_time;

    // Skip events without valid start/end times
    if (!startTime || !endTime) {
      console.error('Skipping event due to invalid timestamps:', event.id, {
        startTime,
        endTime,
        rawStartTime: event.when?.start_time || event.start_time,
        rawEndTime: event.when?.end_time || event.end_time
      });
      return;
    }

    // Get conference URL from the conferencing object in Nylas API response
    // or use existing conference_url for database events
    const conferenceUrl = event.conferencing?.details?.url || event.conference_url || null;
    console.log('Event:', event.id, 'Conference URL:', conferenceUrl);

    // Check if event exists and compare last_updated_at
    const existingEventLastUpdated = existingEventsMap.get(event.id);
    const eventLastUpdated = event.updated_at ? 
      (event.when ? safeTimestampToISO(event.updated_at) : event.updated_at) : 
      event.last_updated_at;

    if (!eventLastUpdated) {
      console.error('Skipping event due to invalid updated_at timestamp:', event.id);
      return;
    }

    // Skip if event exists and hasn't been updated
    if (existingEventLastUpdated && new Date(eventLastUpdated) <= existingEventLastUpdated) {
      console.log('Skipping event as it has not been updated:', event.id);
      return;
    }

    // Safely extract and transform event data
    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      start_time: startTime,
      end_time: endTime,
      participants: Array.isArray(event.participants) ? event.participants : [],
      conference_url: conferenceUrl,
      last_updated_at: eventLastUpdated,
      ical_uid: event.ical_uid || null,
      busy: event.busy === false ? false : true,
      html_link: event.html_link || null,
      master_event_id: event.master_event_id || null,
      organizer: event.organizer || null,
      resources: Array.isArray(event.resources) ? event.resources : [],
      read_only: event.read_only || false,
      reminders: event.reminders || {},
      recurrence: Array.isArray(event.recurrence) ? event.recurrence : null,
      status: event.status || null,
      visibility: event.visibility || 'default',
      original_start_time: event.original_start_time ? 
        (event.when ? safeTimestampToISO(event.original_start_time) : event.original_start_time) : 
        null,
    };

    // Log the event data being upserted
    console.log('Upserting event with data:', {
      id: event.id,
      title: eventData.title,
      conference_url: eventData.conference_url,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
    });

    const { error: upsertError } = await supabaseAdmin
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id',
      });

    if (upsertError) {
      console.error('Error upserting event:', upsertError);
      console.error('Failed event data:', JSON.stringify(eventData, null, 2));
      throw upsertError;
    } else {
      console.log('Successfully upserted event:', event.id);
    }
  } catch (error) {
    console.error('Error processing event:', event.id, error);
    throw error;
  }
};