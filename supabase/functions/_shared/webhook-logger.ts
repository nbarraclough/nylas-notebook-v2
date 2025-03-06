
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure webhook logs table exists and has the right structure
export async function ensureWebhookLogsTable() {
  try {
    // Check if webhook_logs table exists
    const { data: tableExists, error: tableCheckError } = await supabase.rpc(
      'select_exists',
      { 
        schema_name: 'public',
        table_name: 'webhook_logs'
      }
    );

    if (tableCheckError) {
      console.error('Error checking if webhook_logs table exists:', tableCheckError);
      return false;
    }

    if (!tableExists) {
      console.log('Creating webhook_logs table...');
      
      // Create webhook_logs table
      const { error: createTableError } = await supabase.rpc(
        'create_webhook_logs_table'
      );

      if (createTableError) {
        console.error('Error creating webhook_logs table:', createTableError);
        return false;
      }
      
      console.log('webhook_logs table created successfully');
    }

    return true;
  } catch (error) {
    console.error('Error in ensureWebhookLogsTable:', error);
    return false;
  }
}

export async function logWebhook(
  requestId: string, 
  webhookData: any, 
  status = 'received',
  errorMessage?: string,
  verificationResult?: {
    error?: string;
    details?: string;
  }
) {
  try {
    const errorDetails = errorMessage || (verificationResult?.details ? 
      `Verification error: ${verificationResult.error} - ${verificationResult.details}` : 
      undefined);

    console.log(`[${requestId}] Logging webhook with status: ${status}, type: ${webhookData?.type || 'unknown'}`);
    
    if (errorDetails) {
      console.error(`[${requestId}] Error details: ${errorDetails}`);
    }

    const { data, error } = await supabase
      .from('webhook_logs')
      .insert({
        request_id: requestId,
        webhook_type: webhookData?.type || 'unknown',
        grant_id: webhookData?.data?.grant_id || webhookData?.data?.object?.grant_id,
        raw_payload: webhookData,
        status,
        error_message: errorDetails
      });

    if (error) {
      console.error(`[${requestId}] Error logging webhook:`, error);
      return null;
    }

    console.log(`[${requestId}] Successfully logged webhook to database`);
    return data;
  } catch (error) {
    console.error(`[${requestId}] Error in logWebhook:`, error);
    return null;
  }
}

export function logWebhookProcessing(type: string, context: Record<string, any>) {
  console.log(`🔄 Processing ${type} webhook:`, context);
}

export function logWebhookError(type: string, error: any) {
  console.error(`❌ Error processing ${type} webhook:`, error);
}

export function logWebhookSuccess(type: string, result?: Record<string, any>) {
  if (result) {
    console.log(`✅ Successfully processed ${type} webhook:`, result);
  } else {
    console.log(`✅ Successfully processed ${type} webhook`);
  }
}

// Add the missing logWebhookRequest and logRawBody functions
export function logWebhookRequest(req: Request) {
  console.log('Received webhook request:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries())
  });
}

export function logRawBody(body: string) {
  // Only log the first part of potentially large payloads
  console.log('Webhook raw body preview:', body.substring(0, 500) + (body.length > 500 ? '...[truncated]' : ''));
}
