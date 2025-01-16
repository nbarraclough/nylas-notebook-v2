import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  user_id: string;
  email: string;
  first_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, email, first_name } = await req.json() as EmailRequest;
    console.log('📧 Processing grant expired email for:', { user_id, email, first_name });

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    const appUrl = new URL(req.url).origin;
    const userName = first_name || 'there';

    // Create HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Calendar Access Expired</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">Calendar Access Expired</h1>
            
            <p>Hi ${userName},</p>
            
            <p>We noticed that your calendar access has expired in Notebook. To continue recording your meetings and accessing your recordings, you'll need to reconnect your calendar.</p>
            
            <div style="background-color: #fff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <strong>What this means:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Your calendar connection is no longer active</li>
                <li>New meetings won't be recorded</li>
                <li>You need to reconnect to restore functionality</li>
              </ul>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${appUrl}/calendar" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reconnect Your Calendar
              </a>
            </div>
            
            <p>If you're having trouble reconnecting your calendar or have any questions, our support team is here to help. Just reply to this email.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The Notebook Team
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Notebook <notifications@notebook.com>',
        to: [email],
        subject: 'Action Required: Your Calendar Access Has Expired',
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result);

    // Log the email notification
    const { error: dbError } = await supabaseAdmin
      .from('email_notifications')
      .insert({
        user_id,
        email_type: 'grant_expired',
      });

    if (dbError) {
      console.error('❌ Failed to log email notification:', dbError);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('❌ Error in send-grant-expired-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
})