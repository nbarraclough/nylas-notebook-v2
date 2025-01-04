import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/nylas-auth.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // Handle CORS
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

    // For non-challenge requests, parse the webhook payload
    const webhookData = await req.json();
    console.log('Webhook payload:', webhookData);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle webhook types
    if (webhookData.type && webhookData.type.startsWith('grant.')) {
      const grantId = webhookData.grant_id;
      const status = webhookData.type === 'grant.created' ? 'active' : 'revoked';
      
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
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})