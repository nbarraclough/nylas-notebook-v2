
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { verifyWebhookSignature } from '../_shared/webhook-verification.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { handleWebhookType } from '../_shared/webhook-type-handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function logWebhook(requestId: string, webhookData: any, processedData: any = null, status = 'success', errorMessage?: string) {
  try {
    const notetakerId = webhookData?.data?.object?.id;
    let grantId;

    // Extract grant_id based on webhook type and structure
    if (webhookData?.data?.grant_id) {
      grantId = webhookData.data.grant_id;
    } else if (webhookData?.data?.object?.grant_id) {
      grantId = webhookData.data.object.grant_id;
    }

    const webhookType = webhookData?.type;
    console.log(`📝 [${requestId}] Logging webhook type: ${webhookType}`);

    // Get user_id from grant_id if available
    let userId = null;
    if (grantId && typeof grantId === 'string') {
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_from_grant', { grant_id_param: grantId });

      if (!userError) {
        userId = userData;
      }
    }

    // Insert webhook log
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

    // Use processedData to create relationships if available
    if (processedData) {
      const relationshipData: any = {
        webhook_log_id: webhookLog.id
      };

      if (processedData.eventId) {
        relationshipData.event_id = processedData.eventId;
      }
      if (processedData.recordingId) {
        relationshipData.recording_id = processedData.recordingId;
      }
      if (notetakerId) {
        relationshipData.notetaker_id = notetakerId;
      }

      // Only create relationship if we have related entities
      if (Object.keys(relationshipData).length > 1) {
        const { error: relationshipError } = await supabase
          .from('webhook_relationships')
          .insert(relationshipData);

        if (relationshipError) {
          console.error(`Failed to create webhook relationship: ${relationshipError.message}`);
        } else {
          console.log(`Created webhook relationship for log ${webhookLog.id}`);
        }
      }
    }

    return { webhookLog, grantId };
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

      // Check for both lowercase and uppercase signature headers
      const signature = req.headers.get('x-nylas-signature') || 
                        req.headers.get('X-Nylas-Signature') || '';
      
      console.log(`📝 [${requestId}] Signature header:`, signature);
      
      // Verify webhook signature
      const isValid = await verifyWebhookSignature(signature, rawBody);
      
      if (!isValid) {
        console.error(`❌ [${requestId}] Invalid webhook signature`);
        // Return 401 for invalid signatures - this is an authentication error
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse webhook data
      const webhookData = JSON.parse(rawBody);
      console.log(`📝 [${requestId}] Processing webhook type:`, webhookData.type);

      // Extract grant ID
      let grantId = webhookData?.data?.grant_id || webhookData?.data?.object?.grant_id;
      
      if (!grantId || typeof grantId !== 'string') {
        // Return 400 for bad requests - invalid data that can't be processed
        console.error(`❌ [${requestId}] Invalid grant ID: ${grantId}`);
        return new Response(
          JSON.stringify({ error: 'Invalid grant ID in webhook data' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First process the webhook data
      let processedData = null;
      let errorMessage = null;
      
      try {
        // Process webhook and get any created/updated record IDs
        processedData = await handleWebhookType(webhookData, grantId, requestId);
        console.log(`✅ [${requestId}] Successfully processed webhook type:`, webhookData.type);
      } catch (processError: any) {
        console.error(`❌ [${requestId}] Error processing webhook:`, processError);
        errorMessage = processError.message;
        
        // Log the webhook with error status
        await logWebhook(
          requestId,
          webhookData,
          processedData,
          'error',
          errorMessage
        );
        
        // Return 500 for processing errors to trigger a retry
        return new Response(
          JSON.stringify({ error: 'Processing error', message: errorMessage }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log successful webhook processing
      await logWebhook(
        requestId,
        webhookData,
        processedData,
        'success'
      );

      // Return 200 only for successful processing
      return new Response(
        JSON.stringify({ success: true, status: 'processed' }),
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
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error processing request:`, error);
    
    // For unexpected/uncaught errors, return 500 to trigger retry
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
