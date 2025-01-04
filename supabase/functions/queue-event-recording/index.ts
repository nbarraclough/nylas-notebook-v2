import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { event_id, user_id, scheduled_for } = await req.json()
    
    console.log('Received request:', { event_id, user_id, scheduled_for })
    
    if (!event_id || !user_id || !scheduled_for) {
      throw new Error('event_id, user_id, and scheduled_for are required')
    }

    // Initialize Supabase clients
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

    // Get user's profile and event details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nylas_grant_id, notetaker_name')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      throw new Error('Failed to get user profile')
    }

    if (!profile?.nylas_grant_id) {
      throw new Error('Nylas grant ID not found')
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('conference_url')
      .eq('id', event_id)
      .single()

    if (eventError) {
      console.error('Event error:', eventError)
      throw new Error('Failed to get event')
    }

    if (!event?.conference_url) {
      throw new Error('Conference URL not found')
    }

    // Calculate delay in seconds from now until the event start time
    const now = new Date()
    const eventStart = new Date(scheduled_for)
    const delaySeconds = Math.max(0, Math.floor((eventStart.getTime() - now.getTime()) / 1000))

    console.log('Queueing notetaker with delay:', {
      delaySeconds,
      eventStart: eventStart.toISOString(),
      now: now.toISOString()
    })

    // Add to PGMQ queue using our wrapper function
    const { data: queueData, error: queueError } = await supabaseAdmin.rpc(
      'queue_notetaker_request',
      {
        p_queue_name: 'notetaker_requests',
        p_message: {
          user_id,
          event_id,
          scheduled_for,
          nylas_grant_id: profile.nylas_grant_id,
          conference_url: event.conference_url,
          notetaker_name: profile.notetaker_name
        },
        p_delay_seconds: delaySeconds
      }
    )

    if (queueError) {
      console.error('Queue error:', queueError)
      throw queueError
    }

    console.log('Successfully queued message:', queueData)

    // Add to notetaker_queue table for tracking
    const { error: insertError } = await supabaseAdmin
      .from('notetaker_queue')
      .insert({
        user_id,
        event_id,
        scheduled_for,
        status: 'pending'
      })

    if (insertError) {
      console.error('Error inserting queue record:', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Recording queued successfully',
        queue_message_id: queueData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in queue-event-recording:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})