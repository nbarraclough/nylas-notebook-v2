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
  console.log(`Processing event ${event.id} for user ${userId}`);

  const eventData = {
    user_id: userId,
    nylas_event_id: event.id,
    title: event.title,
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
    organizer: event.organizer,
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

  // Check if event exists and if it's different
  const { data: existingEvent } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('nylas_event_id', event.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingEvent) {
    console.log(`New event ${event.id}, inserting`);
    const { error: insertError } = await supabaseAdmin
      .from('events')
      .insert(eventData);
    
    if (insertError) {
      console.error('Error inserting event:', insertError);
      throw insertError;
    }
    return;
  }

  // Compare relevant fields to check if update is needed
  const needsUpdate = JSON.stringify({
    title: existingEvent.title,
    description: existingEvent.description,
    location: existingEvent.location,
    start_time: existingEvent.start_time,
    end_time: existingEvent.end_time,
    participants: existingEvent.participants,
    conference_url: existingEvent.conference_url,
    status: existingEvent.status,
    visibility: existingEvent.visibility
  }) !== JSON.stringify({
    title: eventData.title,
    description: eventData.description,
    location: eventData.location,
    start_time: eventData.start_time,
    end_time: eventData.end_time,
    participants: eventData.participants,
    conference_url: eventData.conference_url,
    status: eventData.status,
    visibility: eventData.visibility
  });

  if (needsUpdate) {
    console.log(`Event ${event.id} has changed, updating`);
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update(eventData)
      .eq('nylas_event_id', event.id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating event:', updateError);
      throw updateError;
    }
  } else {
    console.log(`Event ${event.id} unchanged, skipping update`);
  }
}