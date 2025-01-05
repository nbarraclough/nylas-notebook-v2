import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

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
    let startTime: string | null = null;
    let endTime: string | null = null;

    if (event.when) {
      // Coming from Nylas API - convert Unix timestamp to ISO string
      if (event.when.start_time && event.when.end_time) {
        startTime = new Date(event.when.start_time * 1000).toISOString();
        endTime = new Date(event.when.end_time * 1000).toISOString();
      }
    } else {
      // Coming from Database or other source
      if (event.start_time && event.end_time) {
        startTime = new Date(event.start_time).toISOString();
        endTime = new Date(event.end_time).toISOString();
      }
    }

    // Skip events without valid timestamps
    if (!startTime || !endTime) {
      console.log('Skipping event with invalid timestamps:', {
        id: event.id,
        startTime,
        endTime,
        rawStartTime: event.when?.start_time || event.start_time,
        rawEndTime: event.when?.end_time || event.end_time
      });
      return;
    }

    // Check if this is an all-day event by examining the 'when' object
    if (event.when?.object === 'date' || event.when?.all_day === true) {
      console.log('Skipping all-day event:', event.id);
      return;
    }

    // Get conference URL from either source
    const conferenceUrl = event.conferencing?.details?.url || event.conference_url || null;
    console.log('Event:', event.id, 'Conference URL:', conferenceUrl);

    // Handle last_updated_at timestamp
    const existingEventLastUpdated = existingEventsMap.get(event.ical_uid);
    const eventLastUpdated = new Date().toISOString(); // Default to current time if no timestamp available

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
        (event.when ? new Date(event.original_start_time * 1000).toISOString() : new Date(event.original_start_time).toISOString()) : 
        null,
    };

    console.log('Upserting event with data:', {
      id: event.id,
      ical_uid: event.ical_uid,
      title: eventData.title,
      conference_url: eventData.conference_url,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      forceProcess
    });

    // Use upsert with ical_uid to handle both insert and update cases
    const { error } = await supabaseAdmin
      .from('events')
      .upsert(eventData, {
        onConflict: 'ical_uid',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error upserting event:', error);
      throw error;
    }

    console.log('Successfully upserted event:', event.id);

  } catch (error) {
    console.error('Error processing event:', event.id, error);
    // Don't throw the error, just log it and continue with the next event
    return;
  }
};