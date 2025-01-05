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

export async function processEvent(event: NylasEvent, userId: string, grantId: string, supabaseAdmin: any) {
  try {
    // Skip events without valid timestamps
    if (!event.when?.start_time || !event.when?.end_time) {
      console.log('Skipping event with invalid timestamps:', {
        id: event.id,
        startTime: event.when?.start_time,
        endTime: event.when?.end_time
      });
      return;
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
        new Date(event.original_start_time * 1000).toISOString() : null,
      last_updated_at: new Date().toISOString()
    };

    console.log('Processing event:', {
      id: event.id,
      title: event.title,
      start: eventData.start_time,
      end: eventData.end_time
    });

    // Use upsert with nylas_event_id as the conflict key
    const { error: upsertError } = await supabaseAdmin
      .from('events')
      .upsert(eventData, {
        onConflict: 'nylas_event_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting event:', event.id, upsertError);
      throw upsertError;
    }

    console.log('Successfully processed event:', event.id);
  } catch (error) {
    console.error('Error processing event:', event.id, error);
    // Don't throw the error, just log it and continue with the next event
  }
}