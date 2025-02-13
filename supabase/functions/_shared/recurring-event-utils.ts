
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
  console.log(`🔄 [${requestId}] Processing recurring event:`, JSON.stringify(event, null, 2));

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

    // For recurring instances, check if we already have this instance
    if (event.master_event_id) {
      const { data: existingInstance, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('nylas_event_id', event.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ [${requestId}] Error checking for existing instance:`, checkError);
        return { success: false, message: checkError.message };
      }

      // If instance doesn't exist, insert it
      if (!existingInstance) {
        console.log(`📝 [${requestId}] Creating new recurring instance:`, event.id);
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData);

        if (insertError) {
          console.error(`❌ [${requestId}] Error inserting recurring instance:`, insertError);
          return { success: false, message: insertError.message };
        }
      } else {
        // Update existing instance
        console.log(`📝 [${requestId}] Updating existing recurring instance:`, event.id);
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', existingInstance.id);

        if (updateError) {
          console.error(`❌ [${requestId}] Error updating recurring instance:`, updateError);
          return { success: false, message: updateError.message };
        }
      }
    } else {
      // For non-recurring events or master events, use upsert
      console.log(`📝 [${requestId}] Upserting event:`, event.id);
      const { error: upsertError } = await supabase
        .from('events')
        .upsert(eventData, {
          onConflict: 'nylas_event_id,user_id'
        });

      if (upsertError) {
        console.error(`❌ [${requestId}] Error upserting event:`, upsertError);
        return { success: false, message: upsertError.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error processing event:`, error);
    return { success: false, message: error.message };
  }
}

export async function cleanupOrphanedInstances(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  console.log('🧹 Cleaning up orphaned recurring instances');
  
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
    // Find all master_event_ids
    const { data: masterIds, error: masterError } = await supabase
      .from('events')
      .select('master_event_id')
      .not('master_event_id', 'is', null)
      .not('master_event_id', 'eq', '')
      .not('master_event_id', 'eq', 'undefined');

    if (masterError) {
      console.error('Error fetching master events:', masterError);
      throw masterError;
    }

    // Get unique master IDs
    const uniqueMasterIds = [...new Set(masterIds?.map(e => e.master_event_id))];
    console.log(`Found ${uniqueMasterIds.length} unique master event IDs`);

    // For each master ID, verify the master event exists
    for (const masterId of uniqueMasterIds) {
      const { data: masterEvent, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('nylas_event_id', masterId)
        .single();

      if (checkError || !masterEvent) {
        console.log(`Master event ${masterId} not found, cleaning up instances`);
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .eq('master_event_id', masterId);

        if (deleteError) {
          console.error(`Error cleaning up instances for master ${masterId}:`, deleteError);
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}
