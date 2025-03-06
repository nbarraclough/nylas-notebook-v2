
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { unixSecondsToISOString } from './timestamp-utils.ts';

function validateEventData(eventData: any, requestId: string): string[] {
  const errors: string[] = [];

  if (!eventData.id) {
    errors.push('Event ID is required');
  }

  if (!eventData.when) {
    errors.push('Event when object is required');
  } else {
    if (eventData.when.object === 'timespan') {
      if (!eventData.when.start_time) {
        errors.push('Event start time is required for timespan');
      }
      if (!eventData.when.end_time) {
        errors.push('Event end time is required for timespan');
      }
    } else if (eventData.when.object === 'date') {
      if (!eventData.when.date) {
        errors.push('Event date is required for date object');
      }
    } else if (eventData.when.object === 'datespan') {
      if (!eventData.when.start_date) {
        errors.push('Event start date is required for datespan');
      }
      if (!eventData.when.end_date) {
        errors.push('Event end date is required for datespan');
      }
    } else {
      errors.push(`Unsupported when object type: ${eventData.when.object}`);
    }
  }

  if (errors.length > 0) {
    console.error(`❌ [${requestId}] Event validation errors:`, errors);
  }

  return errors;
}

export async function processEventData(eventData: any, userId: string, requestId: string) {
  console.log(`🔄 [${requestId}] Processing event:`, JSON.stringify(eventData, null, 2));

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate required fields
    const validationErrors = validateEventData(eventData, requestId);
    if (validationErrors.length > 0) {
      return { success: false, message: validationErrors.join(', ') };
    }

    let startTime: string | null;
    let endTime: string | null;

    // Handle different when object types
    if (eventData.when?.object === 'timespan') {
      console.log(`⏰ [${requestId}] Processing timespan event:`, eventData.when);
      
      startTime = unixSecondsToISOString(eventData.when.start_time);
      endTime = unixSecondsToISOString(eventData.when.end_time);
      
      if (!startTime || !endTime) {
        console.error(`❌ [${requestId}] Invalid timestamps - Start: ${eventData.when.start_time}, End: ${eventData.when.end_time}`);
        return { success: false, message: 'Invalid event timestamps' };
      }
      
      console.log(`📅 [${requestId}] Converted timestamps:`, { startTime, endTime });
    } else if (eventData.when?.object === 'date') {
      // Handle all-day events
      const dateStr = eventData.when.date;
      startTime = `${dateStr}T00:00:00.000Z`;
      endTime = `${dateStr}T23:59:59.999Z`;
      console.log(`📅 [${requestId}] Processing all-day event for date:`, dateStr);
    } else if (eventData.when?.object === 'datespan') {
      // Handle date span events (multi-day all-day events)
      const startDateStr = eventData.when.start_date;
      const endDateStr = eventData.when.end_date;
      startTime = `${startDateStr}T00:00:00.000Z`;
      endTime = `${endDateStr}T23:59:59.999Z`;
      console.log(`📅 [${requestId}] Processing datespan event:`, { startDateStr, endDateStr });
    } else {
      console.error(`❌ [${requestId}] Unsupported when object type:`, eventData.when?.object);
      return { success: false, message: 'Unsupported event type' };
    }

    // Log if event has no title
    if (!eventData.title) {
      console.log(`ℹ️ [${requestId}] Processing event with no title. Event ID: ${eventData.id}`);
    }

    const eventRecord = {
      user_id: userId,
      nylas_event_id: eventData.id,
      title: eventData.title || '(No title)',
      description: eventData.description,
      location: eventData.location,
      start_time: startTime,
      end_time: endTime,
      participants: eventData.participants || [],
      conference_url: eventData.conferencing?.details?.url,
      ical_uid: eventData.ical_uid,
      busy: eventData.busy !== false,
      html_link: eventData.html_link,
      master_event_id: eventData.master_event_id,
      organizer: eventData.organizer || {},
      resources: eventData.resources || [],
      read_only: eventData.read_only || false,
      reminders: eventData.reminders || {},
      recurrence: eventData.recurrence,
      status: eventData.status,
      visibility: eventData.visibility || 'default',
      original_start_time: eventData.original_start_time ? 
        unixSecondsToISOString(eventData.original_start_time) : null,
      last_updated_at: new Date().toISOString()
    };

    console.log(`📅 [${requestId}] Upserting event data:`, JSON.stringify(eventRecord, null, 2));

    const { error: upsertError } = await supabase
      .from('events')
      .upsert(eventRecord, {
        onConflict: 'nylas_event_id,user_id'
      });

    if (upsertError) {
      console.error(`❌ [${requestId}] Error upserting event:`, upsertError);
      return { success: false, message: upsertError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error processing event:`, error);
    return { success: false, message: error.message };
  }
}
