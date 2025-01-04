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

export const findUserByGrant = async (grantId: string) => {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nylas_grant_id', grantId)
    .single();

  if (profileError) {
    console.error('Error finding user for grant:', profileError);
    throw profileError;
  }

  return profile;
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