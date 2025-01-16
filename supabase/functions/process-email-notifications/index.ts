import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get unprocessed notifications
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('email_notifications')
      .select('id, user_id, email_type')
      .eq('processed', false)
      .eq('email_type', 'grant_expired')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${notifications?.length ?? 0} unprocessed notifications`);

    for (const notification of notifications ?? []) {
      try {
        // Get user profile
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('email')
          .eq('id', notification.user_id)
          .single();

        if (!profile?.email) {
          console.error(`No email found for user ${notification.user_id}`);
          continue;
        }

        // Call the send-grant-expired-email function
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-grant-expired-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              email: profile.email,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to send email: ${await response.text()}`);
        }

        // Mark notification as processed
        const { error: updateError } = await supabaseClient
          .from('email_notifications')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`Successfully processed notification ${notification.id}`);
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        // Continue with next notification
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: notifications?.length ?? 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in process-email-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});