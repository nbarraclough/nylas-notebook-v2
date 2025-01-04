import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received webhook request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Check for challenge parameter in URL
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      console.log('Responding to challenge request with:', challenge);
      return new Response(challenge, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        }
      });
    }

    // Get the raw request body as a string
    const rawBody = await req.text();
    console.log('Raw webhook body:', rawBody);

    // Only parse as JSON if we have a body
    let webhookData;
    if (rawBody) {
      try {
        webhookData = JSON.parse(rawBody);
        console.log('Parsed webhook data:', webhookData);
      } catch (error) {
        console.error('Error parsing webhook body:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle webhook types
    if (webhookData?.type && webhookData.type.startsWith('grant.')) {
      const grantId = webhookData.grant_id;
      const status = webhookData.type === 'grant.created' ? 'active' : 'revoked';
      
      console.log('Updating grant status:', { grantId, status });
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          grant_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('nylas_grant_id', grantId);

      if (updateError) {
        console.error('Error updating grant status:', updateError);
        throw updateError;
      }

      console.log('Successfully updated grant status');
    }

    return new Response(
      JSON.stringify({ success: true }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})