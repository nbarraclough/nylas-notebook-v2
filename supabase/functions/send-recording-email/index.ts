import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface EmailRequest {
  grantId: string;
  subject: string;
  body: string;
  recipients: Array<{ name: string; email: string; }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { grantId, subject, body, recipients } = await req.json() as EmailRequest;
    console.log('📧 Received email request:', { grantId, subject, recipients });

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Nylas API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      throw new Error(`Nylas API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Email sent successfully:', {
      response: data,
      messageId: data.data?.id,
      threadId: data.data?.thread_id,
    });

    return new Response(
      JSON.stringify(data),
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