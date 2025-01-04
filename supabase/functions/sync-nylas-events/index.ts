import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    
    if (!user_id) {
      throw new Error('user_id is required')
    }

    console.log('Syncing events for user:', user_id)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Nylas grant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Failed to fetch profile:', profileError)
      throw new Error('Failed to fetch profile')
    }

    if (!profile?.nylas_grant_id) {
      console.error('No Nylas grant_id found for user:', user_id)
      throw new Error('No Nylas grant_id found for user')
    }

    console.log('Found Nylas grant_id:', profile.nylas_grant_id)

    // Calculate date range (1 day ago to 3 months from now)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 1)
    
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)

    // Convert to Unix timestamps (seconds)
    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)

    console.log('Fetching events from', startDate.toISOString(), 'to', endDate.toISOString())

    // Fetch events from Nylas
    const response = await fetch(
      `${NYLAS_API_URL}/v3/grants/${profile.nylas_grant_id}/events?start=${startTimestamp}&end=${endTimestamp}&calendar_id=primary`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Nylas API error:', error)
      throw new Error('Failed to fetch events from Nylas')
    }

    const { data: events } = await response.json()
    console.log('Fetched', events.length, 'events from Nylas')

    // Store events in database
    for (const event of events) {
      try {
        // Extract and validate start/end times from the when object
        let startTime = null;
        let endTime = null;

        if (event.when) {
          if (event.when.time) {
            // Handle timespan format
            startTime = event.when.start_time ? new Date(event.when.start_time * 1000).toISOString() : null;
            endTime = event.when.end_time ? new Date(event.when.end_time * 1000).toISOString() : null;
          } else if (event.when.start_time && event.when.end_time) {
            // Direct timestamps
            startTime = new Date(event.when.start_time * 1000).toISOString();
            endTime = new Date(event.when.end_time * 1000).toISOString();
          }
        }

        // Skip events without valid start/end times
        if (!startTime || !endTime) {
          console.warn('Skipping event due to missing start/end time:', event.id);
          continue;
        }

        // Get conference URL from the correct location in the Nylas API response
        const conferenceUrl = event.conference_data?.conference_url || null;
        console.log('Conference URL for event:', event.id, conferenceUrl);

        // Safely extract and transform event data
        const eventData = {
          user_id,
          nylas_event_id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description || null,
          location: event.location || null,
          start_time: startTime,
          end_time: endTime,
          participants: Array.isArray(event.participants) ? event.participants : [],
          conference_url: conferenceUrl,
          last_updated_at: new Date().toISOString(),
          ical_uid: event.ical_uid || null,
          busy: event.busy === false ? false : true, // Default to true if undefined
          html_link: event.html_link || null,
          master_event_id: event.master_event_id || null,
          organizer: event.organizer || null,
          resources: Array.isArray(event.resources) ? event.resources : [],
          read_only: event.read_only || false,
          reminders: event.reminders || {},
          recurrence: Array.isArray(event.recurrence) ? event.recurrence : null,
          status: event.status || null,
          visibility: event.visibility || 'default',
          original_start_time: event.original_start_time 
            ? new Date(event.original_start_time * 1000).toISOString()
            : null,
        };

        const { error: upsertError } = await supabaseClient
          .from('events')
          .upsert(eventData, {
            onConflict: 'nylas_event_id',
          });

        if (upsertError) {
          console.error('Error upserting event:', upsertError);
          console.error('Failed event data:', JSON.stringify(eventData, null, 2));
        }
      } catch (error) {
        console.error('Error processing event:', event.id, error);
        // Continue with next event instead of failing the entire sync
        continue;
      }
    }

    console.log('Successfully synced events to database');

    return new Response(
      JSON.stringify({ message: 'Events synced successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-nylas-events:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});