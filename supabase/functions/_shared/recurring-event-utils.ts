
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

export interface NylasEvent {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  when: {
    object: 'timespan' | 'date' | 'datespan';
    start_time?: number;
    end_time?: number;
    date?: string;
    start_date?: string;
    end_date?: string;
  };
  participants?: Array<{
    name?: string;
    email: string;
    status?: string;
  }>;
  conferencing?: {
    details?: {
      url?: string;
    };
  };
  ical_uid?: string;
  busy?: boolean;
  html_link?: string;
  master_event_id?: string;
  organizer?: {
    name?: string;
    email: string;
  };
  resources?: any[];
  read_only?: boolean;
  reminders?: Record<string, any>;
  recurrence?: string[];
  status?: string;
  visibility?: string;
  original_start_time?: number;
}

export interface ProcessRecurringEventResult {
  success: boolean;
  eventId?: string;
  message?: string;
  error?: any;
}

export function isRecurringInstance(event: NylasEvent): boolean {
  return !!event.master_event_id;
}

export function isModifiedInstance(event: NylasEvent): boolean {
  return isRecurringInstance(event) && !!event.original_start_time;
}

export async function processRecurringEvent(
  event: NylasEvent, 
  userId: string, 
  supabaseUrl: string, 
  supabaseKey: string,
  requestId: string
): Promise<ProcessRecurringEventResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the event details for debugging
    console.log(`🔄 [${requestId}] Processing recurring event:`, {
      eventId: event.id,
      title: event.title,
      masterEventId: event.master_event_id,
      icalUid: event.ical_uid
    });

    // Prepare the event data for upserting into the database
    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description,
      location: event.location,
      start_time: new Date(event.when.start_time! * 1000).toISOString(),
      end_time: new Date(event.when.end_time! * 1000).toISOString(),
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
      original_start_time: event.original_start_time ? new Date(event.original_start_time * 1000).toISOString() : null,
      last_updated_at: new Date().toISOString()
    };

    // Log the event data being upserted
    console.log(`🔄 [${requestId}] Upserting event data:`, {
      eventId: event.id,
      title: event.title,
      startTime: eventData.start_time,
      endTime: eventData.end_time,
      masterEventId: eventData.master_event_id,
      icalUid: eventData.ical_uid
    });

    // Upsert the event data into the database
    const { error: upsertError } = await supabase
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id,user_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error(`❌ [${requestId}] Error upserting event:`, event.id, upsertError);
      return { 
        success: false, 
        eventId: event.id, 
        message: `Error upserting event: ${upsertError.message}`,
        error: upsertError
      };
    } else {
      console.log(`✅ [${requestId}] Successfully processed recurring event:`, {
        eventId: event.id,
        title: event.title
      });
      return { success: true, eventId: event.id };
    }
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error processing recurring event:`, {
      eventId: event.id,
      title: event.title,
      error: error.message,
      stack: error.stack
    });
    return { 
      success: false, 
      eventId: event.id, 
      message: `Error processing recurring event: ${error.message}`,
      error: error
    };
  }
}

export async function cleanupOrphanedInstances(supabaseUrl: string, supabaseKey: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define a reasonable cutoff (e.g., 3 months ago)
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    const cutoffISO = cutoff.toISOString();

    console.log(`🧹 Cleaning orphaned event instances before:`, cutoffISO);

    // Delete orphaned instances
    const { error: deleteError, count } = await supabase
      .from('events')
      .delete()
      .is('master_event_id', null)
      .lt('start_time', cutoffISO);

    if (deleteError) {
      console.error('❌ Error deleting orphaned event instances:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log(`✅ Successfully cleaned up ${count} orphaned event instances.`);
    return { success: true, count };

  } catch (error: any) {
    console.error('❌ Error during cleanup of orphaned instances:', error);
    return { success: false, error: error.message };
  }
}
