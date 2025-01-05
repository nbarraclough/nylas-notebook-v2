import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { corsHeaders } from "../_shared/cors.ts"

interface EmailRequest {
  grantId: string;
  subject: string;
  body: string;
  recipients: Array<{ name: string; email: string; }>;
  recordingId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { grantId, subject, body, recipients, recordingId } = await req.json() as EmailRequest;
    console.log('📧 Received email request:', { grantId, subject, recipients, recordingId });

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }

    const requestBody = {
      subject,
      body,
      to: recipients,
      tracking_options: {
        opens: true,
        links: true,
        thread_replies: true,
      },
    };

    console.log('📤 Sending request to Nylas API:', {
      url: `https://api-staging.us.nylas.com/v3/grants/${grantId}/messages/send`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody, null, 2),
    });

    const response = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    console.log('📨 Nylas API response:', responseData);

    if (!response.ok) {
      console.error('❌ Nylas API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
      });
      throw new Error(`Nylas API error: ${JSON.stringify(responseData)}`);
    }

    // Store email data in the database
    const { data: emailShare, error: dbError } = await supabaseAdmin
      .from('email_shares')
      .insert({
        recording_id: recordingId,
        shared_by: user.id,
        message_id: responseData.data.id,
        thread_id: responseData.data.thread_id,
        subject,
        recipients: JSON.stringify(recipients),
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error(`Failed to store email data: ${dbError.message}`);
    }

    console.log('✅ Email sent and stored successfully:', {
      emailShare,
      messageId: responseData.data.id,
      threadId: responseData.data.thread_id,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        data: responseData,
        emailShare,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Error in send-recording-email function:', {
      error: error.message,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})