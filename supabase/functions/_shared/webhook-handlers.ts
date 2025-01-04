import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const handleEventCreated = async (objectData: any, grantId: string) => {
  console.log('Processing event.created:', objectData);
  
  // Find user associated with this grant
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nylas_grant_id', grantId)
    .single();

  if (profileError) {
    console.error('Error finding user for grant:', profileError);
    throw profileError;
  }

  // Insert or update the event in our database
  const { error: eventError } = await supabaseAdmin
    .from('events')
    .upsert({
      user_id: profile.id,
      nylas_event_id: objectData.id,
      title: objectData.title,
      description: objectData.description,
      location: objectData.location,
      start_time: new Date(objectData.when.start_time * 1000).toISOString(),
      end_time: new Date(objectData.when.end_time * 1000).toISOString(),
      participants: objectData.participants,
      conference_url: objectData.conferencing?.details?.url,
      ical_uid: objectData.ical_uid,
      busy: objectData.busy,
      html_link: objectData.html_link,
      master_event_id: objectData.master_event_id,
      organizer: objectData.organizer,
      resources: objectData.resources,
      read_only: objectData.read_only,
      reminders: objectData.reminders,
      recurrence: objectData.recurrence,
      status: objectData.status,
      visibility: objectData.visibility
    }, {
      onConflict: 'nylas_event_id'
    });

  if (eventError) {
    console.error('Error creating/updating event:', eventError);
    throw eventError;
  }
};

export const handleEventUpdated = async (objectData: any, grantId: string) => {
  console.log('Processing event.updated:', objectData);
  
  // Find user associated with this grant
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nylas_grant_id', grantId)
    .single();

  if (profileError) {
    console.error('Error finding user for grant:', profileError);
    throw profileError;
  }

  // Update the event in our database
  const { error: eventError } = await supabaseAdmin
    .from('events')
    .update({
      title: objectData.title,
      description: objectData.description,
      location: objectData.location,
      start_time: new Date(objectData.when.start_time * 1000).toISOString(),
      end_time: new Date(objectData.when.end_time * 1000).toISOString(),
      participants: objectData.participants,
      conference_url: objectData.conferencing?.details?.url,
      ical_uid: objectData.ical_uid,
      busy: objectData.busy,
      html_link: objectData.html_link,
      master_event_id: objectData.master_event_id,
      organizer: objectData.organizer,
      resources: objectData.resources,
      read_only: objectData.read_only,
      reminders: objectData.reminders,
      recurrence: objectData.recurrence,
      status: objectData.status,
      visibility: objectData.visibility,
      last_updated_at: new Date().toISOString()
    })
    .eq('nylas_event_id', objectData.id)
    .eq('user_id', profile.id);

  if (eventError) {
    console.error('Error updating event:', eventError);
    throw eventError;
  }
};

export const handleEventDeleted = async (objectData: any) => {
  if (objectData?.id) {
    console.log('Processing event.deleted:', objectData.id);
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('nylas_event_id', objectData.id);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      throw deleteError;
    }
  }
};

export const handleGrantStatus = async (grantId: string, status: 'active' | 'revoked' | 'error' | 'expired') => {
  console.log(`Processing grant status update for ${grantId} to ${status}`);
  
  const { error: grantError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      grant_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('nylas_grant_id', grantId);

  if (grantError) {
    console.error(`Error updating grant status to ${status}:`, grantError);
    throw grantError;
  }
};

export const handleGrantCreated = async (data: any) => {
  console.log('Processing grant.created:', {
    grantId: data.object.grant_id,
    provider: data.object.provider,
    loginId: data.object.login_id
  });
  
  await handleGrantStatus(data.object.grant_id, 'active');
};

export const handleGrantUpdated = async (data: any) => {
  console.log('Processing grant.updated:', {
    grantId: data.object.grant_id,
    provider: data.object.provider,
    reauthFlag: data.object.reauthentication_flag
  });
  
  await handleGrantStatus(data.object.grant_id, 'active');
};

export const handleGrantDeleted = async (data: any) => {
  console.log('Processing grant.deleted:', {
    grantId: data.object.grant_id,
    provider: data.object.provider
  });
  
  await handleGrantStatus(data.object.grant_id, 'revoked');
};

export const handleGrantExpired = async (data: any) => {
  console.log('Processing grant.expired:', {
    grantId: data.object.grant_id,
    provider: data.object.provider,
    loginId: data.object.login_id
  });
  
  await handleGrantStatus(data.object.grant_id, 'expired');
};