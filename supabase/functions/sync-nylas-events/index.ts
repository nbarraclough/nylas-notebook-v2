import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    console.log('Syncing events for user:', user_id)

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user's Nylas grant ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    if (!profile?.nylas_grant_id) {
      throw new Error('Nylas grant ID not found')
    }

    console.log('Found Nylas grant ID:', profile.nylas_grant_id)

    // Get Nylas client secret from environment variables
    const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!NYLAS_CLIENT_SECRET) {
      console.error('NYLAS_CLIENT_SECRET environment variable is not set')
      throw new Error('Nylas client secret not configured')
    }

    // Fetch events from Nylas with calendar_id=primary parameter
    console.log('Fetching events from Nylas...')
    const eventsResponse = await fetch(`https://api-staging.us.nylas.com/v3/grants/${profile.nylas_grant_id}/events?calendar_id=primary&limit=100`, {
      headers: {
        'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.text()
      console.error('Failed to fetch Nylas events:', errorData)
      throw new Error('Failed to fetch events from Nylas')
    }

    const events = await eventsResponse.json()
    console.log(`Fetched ${events.data?.length || 0} events from Nylas`)

    // Get existing events for this user
    const { data: existingEvents, error: existingEventsError } = await supabaseAdmin
      .from('events')
      .select('ical_uid')
      .eq('user_id', user_id)

    if (existingEventsError) {
      console.error('Error fetching existing events:', existingEventsError)
      throw existingEventsError
    }

    // Create a Set of existing ical_uids for faster lookup
    const existingIcalUids = new Set(existingEvents?.map(e => e.ical_uid) || [])
    const nylasIcalUids = new Set(events.data?.map(e => e.ical_uid) || [])

    // Delete events that no longer exist in Nylas
    const eventsToDelete = existingEvents?.filter(e => !nylasIcalUids.has(e.ical_uid)) || []
    if (eventsToDelete.length > 0) {
      console.log(`Deleting ${eventsToDelete.length} events that no longer exist in Nylas`)
      const { error: deleteError } = await supabaseAdmin
        .from('events')
        .delete()
        .eq('user_id', user_id)
        .in('ical_uid', eventsToDelete.map(e => e.ical_uid))

      if (deleteError) {
        console.error('Error deleting events:', deleteError)
        throw deleteError
      }
    }

    // Process and store events
    for (const event of events.data || []) {
      const eventData = {
        user_id,
        nylas_event_id: event.id,
        ical_uid: event.ical_uid,
        title: event.title || 'Untitled Event',
        description: event.description,
        location: event.location,
        start_time: event.when?.start_time ? new Date(event.when.start_time * 1000).toISOString() : null,
        end_time: event.when?.end_time ? new Date(event.when.end_time * 1000).toISOString() : null,
        participants: event.participants || [],
        conference_url: event.conferencing?.details?.url || null,
        last_updated_at: event.updated_at ? new Date(event.updated_at * 1000).toISOString() : new Date().toISOString(),
        busy: event.busy !== false,
        html_link: event.html_link,
        master_event_id: event.master_event_id,
        organizer: event.organizer || {},
        resources: event.resources || [],
        read_only: event.read_only || false,
        reminders: event.reminders || {},
        recurrence: event.recurrence,
        status: event.status,
        visibility: event.visibility || 'default',
        original_start_time: event.original_start_time ? 
          new Date(event.original_start_time * 1000).toISOString() : null,
      }

      // Upsert event to database
      const { error: upsertError } = await supabaseAdmin
        .from('events')
        .upsert(eventData, {
          onConflict: 'ical_uid',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('Error upserting event:', upsertError)
        throw upsertError
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Events synced successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync-nylas-events:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})