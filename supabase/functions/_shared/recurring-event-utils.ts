import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Database } from './types/database.ts';
import { unixSecondsToISOString, isValidISOString } from './timestamp-utils.ts';

export function isRecurringInstance(event: any): boolean {
  return !!event.master_event_id;
}

export function isModifiedInstance(event: any): boolean {
  return isRecurringInstance(event) && event.original_start_time;
}

function validateEvent(event: any, requestId: string): string[] {
  const errors: string[] = [];

  if (!event.id) {
    errors.push('Event ID is required');
  }

  if (!event.title) {
    errors.push('Event title is required');
  }

  if (!event.when) {
    errors.push('Event when object is required');
  } else {
    if (event.when.object === 'timespan') {
      if (!event.when.start_time) {
        errors.push('Event start time is required for timespan');
      }
      if (!event.when.end_time) {
        errors.push('Event end time is required for timespan');
      }
    } else if (event.when.object === 'date') {
      if (!event.when.date) {
        errors.push('Event date is required for date object');
      }
    } else {
      errors.push(`Unsupported when object type: ${event.when.object}`);
    }
  }

  if (errors.length > 0) {
    console.error(`❌ [${requestId}] Event validation errors:`, errors);
  }

  return errors;
}

export async function processRecurringEvent(
  event: any,
  userId: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  requestId: string
): Promise<{ success: boolean; message?: string }> {
  console.log(`🔄 [${requestId}] Processing event:`, JSON.stringify(event, null, 2));

  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  try {
    // Validate required fields
    const validationErrors = validateEvent(event, requestId);
    if (validationErrors.length > 0) {
      return { success: false, message: validationErrors.join(', ') };
    }

    let startTime: string | null;
    let endTime: string | null;

    // Handle different when object types
    if (event.when?.object === 'timespan') {
      console.log(`⏰ [${requestId}] Processing timespan event. Start: ${event.when.start_time}, End: ${event.when.end_time}`);
      
      startTime = unixSecondsToISOString(event.when.start_time);
      endTime = unixSecondsToISOString(event.when.end_time);
      
      if (!startTime || !endTime) {
        console.error(`❌ [${requestId}] Invalid timestamps - Start: ${event.when.start_time}, End: ${event.when.end_time}`);
        return { success: false, message: 'Invalid event timestamps' };
      }
    } else if (event.when?.object === 'date') {
      // Handle all-day events
      const dateStr = event.when.date;
      startTime = `${dateStr}T00:00:00.000Z`;
      endTime = `${dateStr}T23:59:59.999Z`;
      console.log(`📅 [${requestId}] Processing all-day event for date: ${dateStr}`);
    } else {
      console.error(`❌ [${requestId}] Unsupported when object type:`, event.when?.object);
      return { success: false, message: 'Unsupported event type' };
    }

    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_time: startTime,
      end_time: endTime,
      participants: event.participants || [],
      conference_url: event.conferencing?.details?.url,
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
      original_start_time: event.original_start_time ? 
        unixSecondsToISOString(event.original_start_time) : null,
      last_updated_at: new Date().toISOString()
    };

    console.log(`📅 [${requestId}] Upserting event data:`, JSON.stringify(eventData, null, 2));

    const { error: upsertError } = await supabase
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id,user_id'
      });

    if (upsertError) {
      console.error(`❌ [${requestId}] Error upserting event:`, upsertError);
      return { success: false, message: upsertError.message };
    }

    // If this is a recurring instance, ensure the master event exists
    if (event.master_event_id) {
      console.log(`🔄 [${requestId}] Processing recurring instance with master_event_id:`, event.master_event_id);
      const { data: masterEvent, error: masterError } = await supabase
        .from('events')
        .select('id')
        .eq('nylas_event_id', event.master_event_id)
        .eq('user_id', userId)
        .single();

      if (masterError || !masterEvent) {
        console.log(`⚠️ [${requestId}] Master event not found, will be fetched by sync job`);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error processing event:`, error);
    return { success: false, message: error.message };
  }
}

export async function cleanupOrphanedInstances(
  masterEventId: string,
  userId: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  console.log('🧹 Cleaning up orphaned instances for master event:', masterEventId);
  
  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('master_event_id', masterEventId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error cleaning up orphaned instances:', error);
    throw error;
  }
  
  console.log('✅ Successfully cleaned up orphaned instances');
}