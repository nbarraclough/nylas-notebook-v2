import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { processEvent } from './event-processor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting incremental events sync');
    const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET');
    
    if (!NYLAS_CLIENT_SECRET) {
      throw new Error('NYLAS_CLIENT_SECRET not configured');
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get all users with Nylas grants
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, nylas_grant_id')
      .not('nylas_grant_id', 'is', null);

    if (profilesError) {
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users with Nylas grants`);

    // Process each user's events
    for (const profile of profiles || []) {
      try {
        console.log(`Fetching events for user ${profile.id}`);
        
        const eventsResponse = await fetch(
          `https://api-staging.us.nylas.com/v3/grants/${profile.nylas_grant_id}/events?calendar_id=primary`,
          {
            headers: {
              'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }
        );

        if (!eventsResponse.ok) {
          console.error(`Failed to fetch events for user ${profile.id}:`, await eventsResponse.text());
          continue;
        }

        const events = await eventsResponse.json();
        console.log(`Processing ${events.data?.length || 0} events for user ${profile.id}`);

        // Process each event
        for (const event of events.data || []) {
          try {
            await processEvent(event, profile.id, profile.nylas_grant_id, supabaseAdmin);
          } catch (error) {
            console.error(`Error processing event ${event.id} for user ${profile.id}:`, error);
            // Continue with next event even if one fails
          }
        }
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        // Continue with next user even if one fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Events sync completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in incremental events sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});