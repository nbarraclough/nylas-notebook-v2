import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../src/integrations/supabase/types';

interface NylasEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  when: {
    object: string;
    start_time: number;
    end_time: number;
  };
  participants?: Array<{
    name?: string;
    email: string;
    status?: string;
  }>;
  conferencing?: {
    details: {
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

function convertTimestampToISOString(timestamp: number | null | undefined): string | null {
  if (!timestamp) {
    console.error('Received null or undefined timestamp');
    return null;
  }
  
  try {
    // Nylas sends timestamps in seconds, create Date object directly from seconds
    const date = new Date(timestamp * 1000);
    const isoString = date.toISOString();
    console.log(`Converting timestamp ${timestamp} to ISO string: ${isoString}`);
    return isoString;
  } catch (error) {
    console.error('Error converting timestamp:', timestamp, error);
    return null;
  }
}

export function isRecurringInstance(event: NylasEvent): boolean {
  return !!event.master_event_id;
}

function validateEvent(event: NylasEvent): string[] {
  const errors: string[] = [];

  if (!event.id) {
    errors.push('Event ID is required');
  }

  if (!event.title) {
    errors.push('Event title is required');
  }

  if (!event.when?.start_time) {
    errors.push('Event start time is required');
  }

  if (!event.when?.end_time) {
    errors.push('Event end time is required');
  }

  return errors;
}

export async function processRecurringEvent(
  event: NylasEvent,
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
    const validationErrors = validateEvent(event);
    if (validationErrors.length > 0) {
      console.error(`❌ [${requestId}] Event validation failed:`, validationErrors);
      return { success: false, message: validationErrors.join(', ') };
    }

    if (event.when?.object === 'timespan') {
      console.log(`⏰ [${requestId}] Processing timespan event. Start: ${event.when.start_time}, End: ${event.when.end_time}`);
      
      const startTime = convertTimestampToISOString(event.when.start_time);
      const endTime = convertTimestampToISOString(event.when.end_time);
      
      if (!startTime || !endTime) {
        console.error(`❌ [${requestId}] Invalid timestamps - Start: ${event.when.start_time}, End: ${event.when.end_time}`);
        return { success: false, message: 'Invalid event timestamps' };
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
        busy: event.busy !== false, // Default to true if undefined
        html_link: event.html_link,
        master_event_id: event.master_event_id,
        organizer: event.organizer || {},
        resources: event.resources || [],
        read_only: event.read_only || false,
        reminders: event.reminders || {},
        recurrence: event.recurrence,
        status: event.status,
        visibility: event.visibility || 'default',
        original_start_time: event.original_start_time ? convertTimestampToISOString(event.original_start_time) : null,
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
    } else {
      console.error(`❌ [${requestId}] Unsupported event type:`, event.when?.object);
      return { success: false, message: 'Unsupported event type' };
    }
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
}