
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { handleWebhookType } from '../_shared/webhook-type-handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function logWebhook(requestId: string, webhookData: any, status = 'success', errorMessage?: string) {
  try {
    // Extract notetaker ID and grant ID
    const notetakerId = webhookData?.data?.object?.id;
    let grantId;

    // Properly extract grant_id based on webhook type and structure
    if (webhookData?.data?.grant_id) {
      grantId = webhookData.data.grant_id;
    } else if (webhookData?.data?.object?.grant_id) {
      grantId = webhookData.data.object.grant_id;
    }

    const webhookType = webhookData?.type;

    console.log(`📝 [${requestId}] Processing webhook type: ${webhookType}`);
    console.log(`📝 [${requestId}] Using grant ID:`, grantId);

    // First, try to get the user_id from the grant_id if available
    let userId = null;
    if (grantId && typeof grantId === 'string') {
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_from_grant', { grant_id_param: grantId });

      if (userError) {
        console.error(`Failed to get user_id for grant ${grantId}:`, userError);
      } else {
        userId = userData;
        console.log(`📝 [${requestId}] Found user ID:`, userId);
      }
    }

    // Extract state changes for status updates
    let previousState = null;
    let newState = null;
    if (webhookType === 'notetaker.status_updated') {
      previousState = webhookData?.data?.object?.previous_status;
      newState = webhookData?.data?.object?.status;
    }

    // Insert the webhook log
    const { data: webhookLog, error: webhookError } = await supabase
      .from('webhook_logs')
      .insert({
        request_id: requestId,
        webhook_type: webhookType,
        grant_id: grantId,
        raw_payload: webhookData,
        status,
        error_message: errorMessage,
        user_id: userId
      })
      .select()
      .single();

    if (webhookError) {
      console.error(`Failed to log webhook: ${webhookError.message}`);
      return;
    }

    // Extract relationship data based on webhook type
    let eventId = null;
    let recordingId = null;

    // Handle different webhook types
    if (webhookType?.startsWith('event.')) {
      const nylasEventId = webhookData?.data?.object?.id;
      if (nylasEventId) {
        // Look up our internal event ID using the Nylas event ID
        const { data: event } = await supabase
          .from('events')
          .select('id')
          .eq('nylas_event_id', nylasEventId)
          .single();
        
        if (event) {
          eventId = event.id;
          console.log(`Found internal event ID ${eventId} for Nylas event ${nylasEventId}`);
        } else {
          console.log(`No matching internal event found for Nylas event ${nylasEventId}`);
        }
      }
    } else if (webhookType?.startsWith('notetaker.')) {
      // For notetaker webhooks, try to find the associated recording
      if (notetakerId) {
        const { data: recording } = await supabase
          .from('recordings')
          .select('id')
          .eq('notetaker_id', notetakerId)
          .single();
        
        if (recording) {
          recordingId = recording.id;
        }
      }
    }

    // Create webhook relationship if we have related entities
    if (eventId || recordingId || notetakerId) {
      const { error: relationshipError } = await supabase
        .from('webhook_relationships')
        .insert({
          webhook_log_id: webhookLog.id,
          event_id: eventId,
          recording_id: recordingId,
          notetaker_id: notetakerId
        });

      if (relationshipError) {
        console.error(`Failed to create webhook relationship: ${relationshipError.message}`);
      } else {
        console.log(`Created webhook relationship for log ${webhookLog.id} with event: ${eventId}, recording: ${recordingId}, notetaker: ${notetakerId}`);
      }
    }

    return webhookLog;
  } catch (error) {
    console.error('Error logging webhook:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    // Only process webhooks for POST requests
    if (req.method === 'POST') {
      const rawBody = await req.text();
      console.log(`📝 [${requestId}] Raw webhook body:`, rawBody);

      // Verify webhook signature
      const signature = req.headers.get('x-nylas-signature') || '';
      const isValid = await verifyWebhookSignature(signature, rawBody);
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Invalid webhook signature`);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse webhook data
      const webhookData = JSON.parse(rawBody);
      console.log(`📝 [${requestId}] Webhook type:`, webhookData.type);

      // First log the webhook
      const webhookLog = await logWebhook(requestId, webhookData);

      // Then process the webhook using the type handlers
      try {
        await handleWebhookType(webhookData, supabase);
        console.log(`✅ [${requestId}] Successfully processed webhook type:`, webhookData.type);
      } catch (processError: any) {
        console.error(`❌ [${requestId}] Error processing webhook:`, processError);
        // Update the webhook log with the error
        await supabase
          .from('webhook_logs')
          .update({ 
            status: 'error',
            error_message: processError.message
          })
          .eq('id', webhookLog.id);
        
        throw processError;
      }

      return new Response(
        JSON.stringify({ success: true, status: 'acknowledged' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing request:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
