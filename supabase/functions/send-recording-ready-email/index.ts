import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://notebook.nylas.ai';

interface EmailRequest {
  recordingId: string;
  userId: string;
  grantId: string;
}

interface NylasResponse {
  request_id: string;
  grant_id: string;
  data: {
    subject: string;
    body: string;
    from: Array<{ name: string; email: string }>;
    to: Array<{ name: string; email: string }>;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId, userId, grantId } = await req.json() as EmailRequest;
    console.log('📧 Processing recording ready email:', { recordingId, userId, grantId });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recording details with event info and owner profile
    const { data: recording, error: recordingError } = await supabaseClient
      .from('recordings')
      .select(`
        *,
        event:events (
          title,
          description,
          participants
        ),
        owner:profiles!inner (
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      console.error('❌ Error fetching recording:', recordingError);
      throw new Error('Recording not found');
    }

    // Format sender name
    const senderName = recording.owner.first_name && recording.owner.last_name
      ? `${recording.owner.first_name} ${recording.owner.last_name}`
      : recording.owner.email.split('@')[0];

    // Format participants list for email
    const participants = recording.event.participants
      .map((p: any) => {
        const name = p.name || p.email.split('@')[0];
        return `<li style="margin: 4px 0; color: #475569;">${name} (${p.email})</li>`;
      })
      .join('');

    // Create deep link to recording using BASE_URL
    const recordingUrl = `${BASE_URL}/library/${recordingId}`;

    // Format HTML email content with enhanced styling
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Your Recording is Ready</h1>
          <div style="width: 50px; height: 4px; background: #2563eb; margin: 16px auto;"></div>
        </div>
        
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Hi ${senderName},
        </p>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #2563eb;">
          <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px;">${recording.event.title}</h2>
          
          ${recording.event.description ? `
            <p style="color: #475569; margin: 12px 0; line-height: 1.6;">
              ${recording.event.description}
            </p>
          ` : ''}
          
          <div style="margin: 20px 0;">
            <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 8px 0;">Participants:</h3>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
              ${participants}
            </ul>
          </div>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${recordingUrl}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
                    transition: background-color 0.2s ease;">
            Watch Recording
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 32px; line-height: 1.6;">
          This recording is accessible through your Notebook account.<br>
          If you have any questions, please contact your administrator.
        </p>
      </div>
    `;

    // Prepare email request for Nylas API
    const emailRequest = {
      subject: `Recording Ready: ${recording.event.title}`,
      body: htmlContent,
      from: [{
        name: senderName,
        email: recording.owner.email
      }],
      to: [{
        name: senderName,
        email: recording.owner.email
      }]
    };

    console.log('📤 Sending email via Nylas API:', {
      grantId,
      subject: emailRequest.subject,
      from: emailRequest.from,
      to: emailRequest.to
    });

    // Send email via Nylas
    const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(emailRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Nylas API error:', errorText);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    const nylasResponse = await response.json() as NylasResponse;
    console.log('✅ Email sent successfully:', {
      requestId: nylasResponse.request_id,
      grantId: nylasResponse.grant_id,
      messageData: nylasResponse.data
    });

    // Log notification in database with recording_id
    const { error: notificationError } = await supabaseClient
      .from('email_notifications')
      .insert({
        user_id: userId,
        email_type: 'recording_ready',
        recording_id: recordingId,
        processed: true,
        processed_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error('❌ Error logging notification:', notificationError);
      // Don't throw here as email was already sent
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        requestId: nylasResponse.request_id,
        messageData: nylasResponse.data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-recording-ready-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});