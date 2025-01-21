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
          start_time,
          end_time,
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
        return `${name} (${p.email})`;
      })
      .join('<br>');

    // Format date and time
    const startDate = new Date(recording.event.start_time);
    const endDate = new Date(recording.event.end_time);
    
    const meetingDate = startDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const meetingTime = `${startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })} - ${endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;

    // Create deep link to recording using BASE_URL
    const recordingUrl = `${BASE_URL}/library/${recordingId}`;

    // Format HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Meeting Recording is Ready</h2>
        
        <p>Hi ${senderName},</p>
        
        <p>Your recording for the following meeting is now ready to watch:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b;">${recording.event.title}</h3>
          
          <p style="margin: 5px 0; color: #475569;">
            <strong>Date:</strong> ${meetingDate}
          </p>
          
          <p style="margin: 5px 0; color: #475569;">
            <strong>Time:</strong> ${meetingTime}
          </p>
          
          <div style="margin: 15px 0;">
            <strong>Participants:</strong><br>
            <span style="color: #475569;">${participants}</span>
          </div>
        </div>

        <a href="${recordingUrl}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Watch Recording
        </a>

        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          This recording is accessible through your Notebook account. If you have any questions,
          please contact your administrator.
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

    // Log notification in database
    const { error: notificationError } = await supabaseClient
      .from('email_notifications')
      .insert({
        user_id: userId,
        email_type: 'recording_ready',
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