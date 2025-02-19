
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Get the current URL from the request to construct the library URL
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const libraryUrl = `${baseUrl}/library?recording=${recordingId}`;
    
    // Replace any direct video links with the library URL
    const updatedBody = body.replace(/{RECORDING_LINK}/g, libraryUrl);

    // Format the body text into HTML, preserving newlines
    const formattedHtml = updatedBody
      .split('\n')
      .map(line => `<p style="margin: 0 0 10px 0;">${line}</p>`)
      .join('');

    const requestBody = {
      subject,
      body: formattedHtml,
      to: recipients.map(r => ({ email: r.email, name: r.name })),
      tracking_options: {
        opens: true,
        links: true,
        thread_replies: true,
      },
    };

    console.log('📤 Sending request to Nylas API:', {
      url: `https://api.us.nylas.com/v3/grants/${grantId}/messages/send`,
      method: 'POST',
      body: JSON.stringify(requestBody, null, 2),
    });

    const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Nylas API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Nylas API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('📨 Nylas API response:', responseData);

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
    console.error('❌ Error in send-recording-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
