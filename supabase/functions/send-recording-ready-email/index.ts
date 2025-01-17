import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { format } from "https://deno.land/x/date_fns@v2.22.1/index.js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  recordingId: string;
  userId: string;
  grantId: string;
}

serve(async (req) => {
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

    // Get recording details with event info
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

    const ownerName = recording.owner.first_name 
      ? `${recording.owner.first_name} ${recording.owner.last_name || ''}`
      : recording.owner.email.split('@')[0];

    // Format participants list
    const participants = recording.event.participants
      .map((p: any) => `${p.name || p.email.split('@')[0]} (${p.email})`)
      .join('<br>');

    // Format date and time
    const meetingDate = format(new Date(recording.event.start_time), "MMMM d, yyyy");
    const meetingTime = `${format(new Date(recording.event.start_time), "h:mm a")} - ${format(new Date(recording.event.end_time), "h:mm a")}`;

    // Create deep link to recording
    const recordingUrl = `${Deno.env.get('PUBLIC_APP_URL')}/library/${recordingId}`;

    // Format HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your Meeting Recording is Ready</h2>
        
        <p>Hi ${ownerName},</p>
        
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

    // Send email via Nylas
    console.log('📤 Sending email via Nylas API');
    const response = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        subject: `Recording Ready: ${recording.event.title}`,
        to: [{ email: recording.owner.email }],
        body: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Nylas API error:', errorText);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    const emailData = await response.json();
    console.log('✅ Email sent successfully:', emailData);

    // Log notification in database
    const { error: notificationError } = await supabaseClient
      .from('email_notifications')
      .insert({
        user_id: userId,
        recording_id: recordingId,
        email_type: 'recording_ready',
        processed: true,
        processed_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error('❌ Error logging notification:', notificationError);
      // Don't throw here as email was already sent
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailData.data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
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