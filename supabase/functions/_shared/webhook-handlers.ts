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
  const { error: syncError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nylas_grant_id', grantId)
    .single();

  if (syncError) {
    console.error('Error finding user for grant:', syncError);
    throw syncError;
  }
};

export const handleEventUpdated = async (objectData: any, grantId: string) => {
  console.log('Processing event.updated:', objectData);
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nylas_grant_id', grantId)
    .single();

  if (updateError) {
    console.error('Error finding user for grant:', updateError);
    throw updateError;
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