import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { NylasEvent } from '../_shared/recurring-event-utils.ts';

function convertTimestampToISOString(timestamp: number): string {
  // Nylas timestamps are in milliseconds
  return new Date(timestamp).toISOString();
}

export async function processEvent(event: NylasEvent, userId: string, supabaseUrl: string, supabaseKey: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate timestamps before processing
    if (event.when.object !== 'timespan') {
      console.log('Skipping non-timespan event:', {
        id: event.id,
        title: event.title,
        whenObject: event.when.object
      });
      return;
    }

    const { start_time, end_time } = event.when;
    if (!start_time || !end_time || isNaN(start_time) || isNaN(end_time)) {
      console.log('Skipping event with invalid timestamps:', {
        id: event.id,
        title: event.title,
        startTime: start_time,
        endTime: end_time
      });
      return;
    }

    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description,
      text_description: event.text_description,
      location: event.location,
      start_time: convertTimestampToISOString(start_time),
      end_time: convertTimestampToISOString(end_time),
      participants: event.participants || [],
      conference_url: event.conferencing?.details?.url || null,
      ical_uid: event.ical_uid,
      busy: event.busy !== false,
      html_link: event.html_link,
      master_event_id: event.master_event_id,
      organizer: event.organizer || {},
      resources: event.resources || [],
      read_only: event.read_only || false,
      reminders: event.reminders || {},
      recurrence: event.recurrence,
      status: event.status,
      visibility: event.visibility || 'default',
      original_start_time: event.original_start_time 
        ? convertTimestampToISOString(event.original_start_time)
        : null,
      last_updated_at: new Date().toISOString()
    };

    console.log('Processing event:', {
      id: event.id,
      title: event.title,
      start: eventData.start_time,
      end: eventData.end_time,
      masterEventId: eventData.master_event_id,
      icalUid: eventData.ical_uid,
      isRecurring: !!eventData.recurrence || !!eventData.master_event_id,
      conferenceUrl: eventData.conference_url,
      participants: eventData.participants.length
    });

    const { error: upsertError } = await supabase
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id,user_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting event:', event.id, upsertError);
    } else {
      console.log('Successfully processed event:', {
        id: event.id,
        title: event.title,
        isRecurring: !!eventData.recurrence || !!eventData.master_event_id
      });
    }
  } catch (error) {
    console.error('Error processing event:', {
      eventId: event.id,
      title: event.title,
      error: error.message,
      stack: error.stack
    });
  }
}