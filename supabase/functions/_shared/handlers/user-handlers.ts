import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { logWebhookProcessing, logWebhookError, logWebhookSuccess } from '../webhook-logger.ts';

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
  logWebhookProcessing('findUserByGrant', { grantId });
  
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nylas_grant_id', grantId)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      logWebhookError('findUserByGrant', `No user found for grant ID: ${grantId}`);
      return null;
    }
    logWebhookError('findUserByGrant', profileError);
    throw profileError;
  }

  logWebhookSuccess('findUserByGrant', profile);
  return profile;
};

export const handleGrantStatus = async (grantId: string, status: 'active' | 'revoked' | 'error' | 'expired') => {
  logWebhookProcessing('grantStatus', { grantId, status });
  
  try {
    const { error: grantError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        grant_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('nylas_grant_id', grantId);

    if (grantError) {
      logWebhookError('grantStatus', grantError);
      return { success: false, error: grantError };
    }

    const result = { success: true, grantId, status };
    logWebhookSuccess('grantStatus', result);
    return result;
  } catch (error) {
    logWebhookError('grantStatus', error);
    return { success: false, error };
  }
};

export const handleGrantCreated = async (data: any) => {
  logWebhookProcessing('grant.created', data);
  const result = await handleGrantStatus(data.object.grant_id, 'active');
  logWebhookSuccess('grant.created', result);
  return result;
};

export const handleGrantUpdated = async (data: any) => {
  logWebhookProcessing('grant.updated', data);
  const result = await handleGrantStatus(data.object.grant_id, 'active');
  logWebhookSuccess('grant.updated', result);
  return result;
};

export const handleGrantDeleted = async (data: any) => {
  logWebhookProcessing('grant.deleted', data);
  const result = await handleGrantStatus(data.object.grant_id, 'revoked');
  logWebhookSuccess('grant.deleted', result);
  return result;
};

export const handleGrantExpired = async (data: any) => {
  logWebhookProcessing('grant.expired', data);
  const result = await handleGrantStatus(data.object.grant_id, 'expired');
  logWebhookSuccess('grant.expired', result);
  return result;
};