import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

interface TimeSpan {
  object: 'timespan';
  start_time: string; // ISO string converted from Unix timestamp
  end_time: string;   // ISO string converted from Unix timestamp
  start_timezone?: string;
  end_timezone?: string;
}

interface DateSpan {
  object: 'datespan';
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

interface SingleDate {
  object: 'date';
  date: string; // YYYY-MM-DD
}

export interface NylasEvent {
  id: string;
  title: string;
  description?: string | null;
  text_description?: string | null;
  when: TimeSpan | DateSpan | SingleDate;
  participants?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  master_event_id?: string | null;
  original_start_time?: string | null; // ISO string converted from Unix timestamp
  busy?: boolean;
  calendar_id?: string;
  created_at?: string | null;
  grant_id?: string;
  html_link?: string | null;
  ical_uid?: string | null;
  location?: string | null;
  metadata?: Record<string, any>;
  object?: string;
  organizer?: {
    name?: string;
    email: string;
  } | null;
  resources?: Array<any>;
  read_only?: boolean;
  reminders?: {
    use_default?: boolean;
    overrides?: Array<{
      reminder_minutes?: number;
      reminder_method?: string;
    }>;
  };
  recurrence?: string[];
  status?: 'confirmed' | 'cancelled' | 'maybe';
  updated_at?: string | null;
  visibility?: 'private' | 'public' | null;
}

export function isRecurringInstance(event: NylasEvent): boolean {
  return !!event.master_event_id;
}

export function isModifiedInstance(event: NylasEvent): boolean {
  return isRecurringInstance(event) && !!event.original_start_time;
}

export function validateRecurringEvent(event: NylasEvent, masterEvent?: NylasEvent): string[] {
  const errors: string[] = [];

  if (!event.id) {
    errors.push('Event must have an ID');
  }

  if (event.recurrence && event.master_event_id) {
    errors.push('Event cannot be both a master and an instance');
  }

  // Check for when.start_time in timespan events
  if (event.master_event_id && event.when.object === 'timespan') {
    if (!event.when.start_time || isNaN(Date.parse(event.when.start_time))) {
      errors.push('Instance must have a valid start time in when.start_time');
    }
  }

  if (masterEvent && !event.original_start_time) {
    errors.push('Modified instance must have original_start_time');
  }

  return errors;
}

function convertTimestampToISOString(timestamp: number): string {
  // Nylas timestamps are in milliseconds
  return new Date(timestamp).toISOString();
}

export async function processRecurringEvent(
  event: NylasEvent,
  userId: string,
  supabaseUrl: string,
  supabaseKey: string,
  requestId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const errors = validateRecurringEvent(event);
    
    if (errors.length > 0) {
      console.error(`❌ [${requestId}] Validation errors:`, errors);
      return { success: false, message: errors.join(', ') };
    }

    // Handle timespan events
    if (event.when.object === 'timespan') {
      const eventData = {
        user_id: userId,
        nylas_event_id: event.id,
        title: event.title,
        description: event.description,
        text_description: event.text_description,
        start_time: convertTimestampToISOString(Number(event.when.start_time)),
        end_time: convertTimestampToISOString(Number(event.when.end_time)),
        participants: event.participants || [],
        recurrence: event.recurrence,
        organizer: event.organizer || {},
        busy: event.busy,
        html_link: event.html_link,
        ical_uid: event.ical_uid,
        location: event.location,
        resources: event.resources || [],
        read_only: event.read_only || false,
        reminders: event.reminders || {},
        status: event.status,
        visibility: event.visibility,
        last_updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('events')
        .upsert(eventData, {
          onConflict: 'nylas_event_id,user_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error(`❌ [${requestId}] Error upserting event:`, upsertError);
        return { success: false, message: upsertError.message };
      }
    }

    return { success: true, message: 'Event processed successfully' };
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing event:`, error);
    return { success: false, message: error.message };
  }
}

export async function cleanupOrphanedInstances(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find instances with master_event_id that don't have a corresponding master event
    const { data: orphanedInstances, error: findError } = await supabase
      .from('events')
      .select('id, master_event_id')
      .not('master_event_id', 'is', null)
      .not('master_event_id', 'eq', '');

    if (findError) {
      console.error('Error finding orphaned instances:', findError);
      return { success: false, message: findError.message };
    }

    if (!orphanedInstances || orphanedInstances.length === 0) {
      return { success: true, message: 'No orphaned instances found' };
    }

    // Get all master event IDs
    const { data: masterEvents, error: masterError } = await supabase
      .from('events')
      .select('id')
      .not('recurrence', 'is', null);

    if (masterError) {
      console.error('Error finding master events:', masterError);
      return { success: false, message: masterError.message };
    }

    const masterEventIds = new Set(masterEvents?.map(e => e.id) || []);

    // Filter out instances whose master event doesn't exist
    const orphanedIds = orphanedInstances
      .filter(instance => !masterEventIds.has(instance.master_event_id))
      .map(instance => instance.id);

    if (orphanedIds.length === 0) {
      return { success: true, message: 'No orphaned instances to delete' };
    }

    // Delete orphaned instances
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .in('id', orphanedIds);

    if (deleteError) {
      console.error('Error deleting orphaned instances:', deleteError);
      return { success: false, message: deleteError.message };
    }

    return {
      success: true,
      message: `Successfully deleted ${orphanedIds.length} orphaned instances`
    };
  } catch (error) {
    console.error('Error in cleanupOrphanedInstances:', error);
    return { success: false, message: error.message };
  }
}
