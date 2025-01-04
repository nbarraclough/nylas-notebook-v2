import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { safeTimestampToISO } from './timestamp-utils.ts';

export const processEvent = async (
  event: any, 
  existingEventsMap: Map<string, Date>,
  userId: string,
  supabaseClient: ReturnType<typeof createClient>
) => {
  try {
    // Extract and validate start/end times from the when object
    const startTime = safeTimestampToISO(event.when?.start_time);
    const endTime = safeTimestampToISO(event.when?.end_time);

    // Skip events without valid start/end times
    if (!startTime || !endTime) {
      console.warn('Skipping event due to invalid timestamps:', event.id);
      return;
    }

    // Get conference URL from the conferencing object in Nylas API response
    const conferenceUrl = event.conferencing?.details?.url || null;
    console.log('Event:', event.id, 'Raw conferencing data:', JSON.stringify(event.conferencing));
    console.log('Conference URL extracted:', conferenceUrl);

    // Check if event exists and compare last_updated_at
    const existingEventLastUpdated = existingEventsMap.get(event.id);
    const eventLastUpdated = safeTimestampToISO(event.updated_at);

    if (!eventLastUpdated) {
      console.warn('Skipping event due to invalid updated_at timestamp:', event.id);
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
      conference_url: conferenceUrl, // This will now be properly set from the conferencing.details.url
      last_updated_at: eventLastUpdated,
      ical_uid: event.ical_uid || null,
      busy: event.busy === false ? false : true, // Default to true if undefined
      html_link: event.html_link || null,
      master_event_id: event.master_event_id || null,
      organizer: event.organizer || null,
      resources: Array.isArray(event.resources) ? event.resources : [],
      read_only: event.read_only || false,
      reminders: event.reminders || {},
      recurrence: Array.isArray(event.recurrence) ? event.recurrence : null,
      status: event.status || null,
      visibility: event.visibility || 'default',
      original_start_time: safeTimestampToISO(event.original_start_time),
    };

    // Log the event data being upserted
    console.log('Upserting event with data:', {
      id: event.id,
      title: eventData.title,
      conference_url: eventData.conference_url,
      start_time: eventData.start_time,
    });

    const { error: upsertError } = await supabaseClient
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id',
      });

    if (upsertError) {
      console.error('Error upserting event:', upsertError);
      console.error('Failed event data:', JSON.stringify(eventData, null, 2));
    } else {
      console.log('Successfully upserted event:', event.id);
    }
  } catch (error) {
    console.error('Error processing event:', event.id, error);
  }
};