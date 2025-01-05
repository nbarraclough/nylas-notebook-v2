import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { processEvent } from './event-processor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, force_recording_rules = false } = await req.json()
    console.log('Syncing events for user:', user_id, 'force_recording_rules:', force_recording_rules)

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

    // Get user's profile and Nylas grant ID
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
      console.log('User has no Nylas grant ID, skipping sync:', user_id)
      return new Response(
        JSON.stringify({ success: false, message: 'No Nylas grant ID found for user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get existing events to track updates
    const { data: existingEvents, error: existingEventsError } = await supabaseAdmin
      .from('events')
      .select('ical_uid, last_updated_at')
      .eq('user_id', user_id)

    if (existingEventsError) {
      console.error('Error fetching existing events:', existingEventsError)
      throw existingEventsError
    }

    // Create a Map for faster lookup of existing events
    const existingEventsMap = new Map(
      existingEvents?.map(event => [event.ical_uid, new Date(event.last_updated_at)]) || []
    )

    console.log('Fetching Nylas events for grant ID:', profile.nylas_grant_id)
    
    const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!NYLAS_CLIENT_SECRET) {
      console.error('NYLAS_CLIENT_SECRET environment variable is not set')
      throw new Error('Nylas client secret not configured')
    }

    // Fetch events from Nylas
    const eventsResponse = await fetch(
      `https://api-staging.us.nylas.com/v3/grants/${profile.nylas_grant_id}/events?calendar_id=primary`, 
      {
        headers: {
          'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    )

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.text()
      console.error('Failed to fetch Nylas events:', errorData)
      throw new Error('Failed to fetch events from Nylas')
    }

    const events = await eventsResponse.json()
    console.log(`Fetched ${events.data?.length || 0} events from Nylas`)

    // Process each event
    for (const event of events.data || []) {
      try {
        await processEvent(event, existingEventsMap, user_id, supabaseAdmin, force_recording_rules)
      } catch (error) {
        console.error('Error processing event:', event.id, error)
        // Continue processing other events even if one fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Events synced successfully',
        eventsProcessed: events.data?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync-nylas-events:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})