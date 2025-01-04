import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api.us.nylas.com'

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
    console.log('Using timestamps:', startTimestamp, 'to', endTimestamp)

    // Fetch events from Nylas using Unix timestamps
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
      const { error: upsertError } = await supabaseClient
        .from('events')
        .upsert({
          user_id,
          nylas_event_id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description,
          location: event.location,
          start_time: event.start,
          end_time: event.end,
          participants: event.participants || [],
          conference_url: event.conferencing?.url,
          last_updated_at: new Date().toISOString()
        }, {
          onConflict: 'nylas_event_id',
        })

      if (upsertError) {
        console.error('Error upserting event:', upsertError)
      }
    }

    console.log('Successfully synced events to database')

    return new Response(
      JSON.stringify({ message: 'Events synced successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in sync-nylas-events:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})