import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { safeTimestampToISO, ensureValidTimestamp } from './timestamp-utils.ts';

export const processEvent = async (
  event: any, 
  existingEventsMap: Map<string, Date>,
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  forceProcess: boolean = false
) => {
  try {
    console.log('Processing event:', {
      id: event.id,
      ical_uid: event.ical_uid,
      rawStartTime: event.when?.start_time || event.start_time,
      rawEndTime: event.when?.end_time || event.end_time,
      source: event.when ? 'Nylas API' : 'Database',
      forceProcess
    });

    // Skip events without ical_uid as they might be temporary or draft events
    if (!event.ical_uid) {
      console.log('Skipping event without ical_uid:', event.id);
      return;
    }

    // Handle timestamps based on source (Nylas API vs Database)
    const startTime = event.when ? 
      safeTimestampToISO(event.when.start_time) : 
      ensureValidTimestamp(event.start_time);
    
    const endTime = event.when ? 
      safeTimestampToISO(event.when.end_time) : 
      ensureValidTimestamp(event.end_time);

    // Skip events without valid timestamps
    if (!startTime || !endTime) {
      console.error('Invalid timestamps for event:', {
        id: event.id,
        startTime,
        endTime,
        rawStartTime: event.when?.start_time || event.start_time,
        rawEndTime: event.when?.end_time || event.end_time
      });
      return;
    }

    // Get conference URL from either source
    const conferenceUrl = event.conferencing?.details?.url || event.conference_url || null;
    console.log('Event:', event.id, 'Conference URL:', conferenceUrl);

    // Handle last_updated_at timestamp
    const existingEventLastUpdated = existingEventsMap.get(event.ical_uid);
    const eventLastUpdated = event.updated_at ? 
      (event.when ? safeTimestampToISO(event.updated_at) : ensureValidTimestamp(event.updated_at)) : 
      ensureValidTimestamp(event.last_updated_at);

    if (!eventLastUpdated) {
      console.error('Invalid updated_at timestamp for event:', event.id);
      return;
    }

    // Skip if event exists and hasn't been updated, unless force processing is enabled
    if (!forceProcess && existingEventLastUpdated && new Date(eventLastUpdated) <= existingEventLastUpdated) {
      console.log('Skipping event as it has not been updated:', event.id);
      return;
    }

    // Safely extract and transform event data
    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      ical_uid: event.ical_uid,
      title: event.title || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      start_time: startTime,
      end_time: endTime,
      participants: Array.isArray(event.participants) ? event.participants : [],
      conference_url: conferenceUrl,
      last_updated_at: eventLastUpdated,
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
        (event.when ? safeTimestampToISO(event.original_start_time) : ensureValidTimestamp(event.original_start_time)) : 
        null,
    };

    // Log the event data being upserted
    console.log('Upserting event with data:', {
      id: event.id,
      ical_uid: event.ical_uid,
      title: eventData.title,
      conference_url: eventData.conference_url,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      forceProcess
    });

    // Use upsert with on_conflict to handle both insert and update cases
    const { error } = await supabaseAdmin
      .from('events')
      .upsert(eventData, {
        onConflict: 'user_id,nylas_event_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error upserting event:', error);
      throw error;
    }

    console.log('Successfully upserted event:', event.id);

  } catch (error) {
    console.error('Error processing event:', event.id, error);
    throw error;
  }
};