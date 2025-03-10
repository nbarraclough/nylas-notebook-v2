
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { NylasEvent } from '../_shared/recurring-event-utils.ts';
import { unixSecondsToISOString } from '../_shared/timestamp-utils.ts';

export async function processEvent(event: NylasEvent, userId: string, supabaseUrl: string, supabaseKey: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate when object
    if (!event.when) {
      console.log('Skipping event without when object:', {
        id: event.id,
        title: event.title
      });
      return;
    }

    let startTimeISO: string | null = null;
    let endTimeISO: string | null = null;

    // Handle different when object types
    if (event.when.object === 'timespan') {
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
      
      // Convert Unix timestamps (seconds) to ISO strings using our utility
      startTimeISO = unixSecondsToISOString(start_time);
      endTimeISO = unixSecondsToISOString(end_time);
    } 
    else if (event.when.object === 'date') {
      const dateStr = event.when.date;
      if (!dateStr) {
        console.log('Skipping all-day event with invalid date:', {
          id: event.id,
          title: event.title
        });
        return;
      }
      
      startTimeISO = `${dateStr}T00:00:00.000Z`;
      endTimeISO = `${dateStr}T23:59:59.999Z`;
    }
    else if (event.when.object === 'datespan') {
      const startDate = event.when.start_date;
      const endDate = event.when.end_date;
      if (!startDate || !endDate) {
        console.log('Skipping datespan event with invalid dates:', {
          id: event.id,
          title: event.title,
          startDate,
          endDate
        });
        return;
      }
      
      startTimeISO = `${startDate}T00:00:00.000Z`;
      endTimeISO = `${endDate}T23:59:59.999Z`;
    }
    else {
      console.log('Skipping event with unsupported when object type:', {
        id: event.id,
        title: event.title,
        whenObject: event.when.object
      });
      return;
    }
      
    if (!startTimeISO || !endTimeISO) {
      console.log('Unable to convert timestamps to ISO format:', {
        id: event.id,
        title: event.title
      });
      return;
    }

    const originalStartTimeISO = event.original_start_time 
      ? unixSecondsToISOString(event.original_start_time)
      : null;

    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description,
      // Removed text_description field that doesn't exist in our database
      location: event.location,
      start_time: startTimeISO,
      end_time: endTimeISO,
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
      original_start_time: originalStartTimeISO,
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

    // Check for duplicate events with the same ical_uid
    if (event.ical_uid) {
      const { data: existingEvents, error: fetchError } = await supabase
        .from('events')
        .select('id, nylas_event_id')
        .eq('ical_uid', event.ical_uid)
        .eq('user_id', userId)
        .neq('nylas_event_id', event.id);
      
      if (fetchError) {
        console.error('Error checking for existing event:', fetchError);
      } else if (existingEvents && existingEvents.length > 0) {
        console.log(`Found duplicate events with same ical_uid but different nylas_event_id:`, {
          icalUid: event.ical_uid,
          newEventId: event.id,
          existingEvents: existingEvents.map(e => ({ id: e.id, nylasEventId: e.nylas_event_id }))
        });
      }
    }

    // Use ical_uid for conflict resolution if it exists
    const upsertOnConflict = event.ical_uid ? 'ical_uid,user_id' : 'nylas_event_id,user_id';

    const { error: upsertError } = await supabase
      .from('events')
      .upsert(eventData, {
        onConflict: upsertOnConflict,
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
