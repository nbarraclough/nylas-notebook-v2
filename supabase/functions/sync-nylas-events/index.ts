import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { processEvent } from './event-processor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, force_recording_rules } = await req.json()
    
    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's Nylas grant ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', user_id)
      .single()

    if (profileError || !profile?.nylas_grant_id) {
      throw new Error('Failed to get Nylas grant ID')
    }

    // If force_recording_rules is true, we'll re-process all events
    if (force_recording_rules) {
      console.log('Force recording rules enabled, fetching all events')
      const { data: events, error: eventsError } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('user_id', user_id)

      if (eventsError) {
        throw new Error('Failed to fetch events')
      }

      // Create a map of existing events for comparison
      const existingEventsMap = new Map(
        events.map(event => [event.ical_uid, new Date(event.last_updated_at)])
      )

      // Re-process each event with force_process set to true
      for (const event of events) {
        await processEvent(event, existingEventsMap, user_id, supabaseAdmin, true)
      }

      return new Response(
        JSON.stringify({ message: 'Events re-processed successfully' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get Nylas access token
    const { data: nylasToken, error: nylasTokenError } = await supabaseAdmin.functions.invoke(
      'get-nylas-access-token',
      { body: { grant_id: profile.nylas_grant_id } }
    )

    if (nylasTokenError || !nylasToken?.access_token) {
      throw new Error('Failed to get Nylas access token')
    }

    // Fetch events from Nylas
    const nylasResponse = await fetch('https://api.nylas.com/events?limit=100', {
      headers: {
        Authorization: `Bearer ${nylasToken.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!nylasResponse.ok) {
      throw new Error(`Nylas API error: ${nylasResponse.statusText}`)
    }

    const events = await nylasResponse.json()

    // Get existing events from database
    const { data: existingEvents, error: existingEventsError } = await supabaseAdmin
      .from('events')
      .select('ical_uid, last_updated_at')
      .eq('user_id', user_id)

    if (existingEventsError) {
      throw new Error('Failed to fetch existing events')
    }

    // Create a map of existing events for comparison using ical_uid
    const existingEventsMap = new Map(
      existingEvents.map(event => [event.ical_uid, new Date(event.last_updated_at)])
    )

    // Process each event
    for (const event of events) {
      await processEvent(event, existingEventsMap, user_id, supabaseAdmin, false)
    }

    return new Response(
      JSON.stringify({ message: 'Events synced successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})