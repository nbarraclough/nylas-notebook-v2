import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface NylasEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  when: {
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

export async function processEvent(event: NylasEvent, userId: string, supabaseUrl: string, supabaseKey: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate timestamps before processing
    if (!event.when?.start_time || !event.when?.end_time || 
        isNaN(event.when.start_time) || isNaN(event.when.end_time)) {
      console.log('Skipping event with invalid timestamps:', {
        id: event.id,
        title: event.title,
        startTime: event.when?.start_time,
        endTime: event.when?.end_time
      });
      return; // Skip this event but continue processing others
    }

    // Extract master_event_id from recurring event instance ID if present
    // Format example: "event_id_20250122T220000Z"
    let masterEventId = event.master_event_id;
    if (!masterEventId && event.id.includes('_')) {
      const parts = event.id.split('_');
      if (parts.length > 1) {
        // Remove the timestamp part to get the master event ID
        masterEventId = parts.slice(0, -1).join('_');
        console.log('Extracted master event ID:', masterEventId, 'from event ID:', event.id);
      }
    }

    const eventData = {
      user_id: userId,
      nylas_event_id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description,
      location: event.location,
      start_time: new Date(event.when.start_time * 1000).toISOString(),
      end_time: new Date(event.when.end_time * 1000).toISOString(),
      participants: event.participants || [],
      conference_url: event.conferencing?.details?.url || null,
      ical_uid: event.ical_uid,
      busy: event.busy !== false, // Default to true if not specified
      html_link: event.html_link,
      master_event_id: masterEventId,
      organizer: event.organizer || {},
      resources: event.resources || [],
      read_only: event.read_only || false,
      reminders: event.reminders || {},
      recurrence: event.recurrence,
      status: event.status,
      visibility: event.visibility || 'default',
      original_start_time: event.original_start_time ? 
        new Date(event.original_start_time * 1000).toISOString() : null,
      last_updated_at: new Date().toISOString()
    };

    console.log('Processing event:', {
      id: event.id,
      title: event.title,
      start: eventData.start_time,
      end: eventData.end_time,
      masterEventId: eventData.master_event_id,
      icalUid: eventData.ical_uid,
      conferenceUrl: eventData.conference_url,
      participants: eventData.participants.length,
      isRecurring: !!eventData.master_event_id || !!eventData.recurrence
    });

    const { error: upsertError } = await supabase
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id,user_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting event:', event.id, upsertError);
      // Don't throw the error, just log it and continue with the next event
    } else {
      console.log('Successfully processed event:', {
        id: event.id,
        title: event.title,
        isRecurring: !!eventData.master_event_id || !!eventData.recurrence
      });
    }
  } catch (error) {
    console.error('Error processing event:', {
      eventId: event.id,
      title: event.title,
      error: error.message,
      stack: error.stack
    });
    // Don't throw the error, just log it and continue with the next event
  }
}