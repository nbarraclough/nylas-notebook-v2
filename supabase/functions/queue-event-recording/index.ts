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

    // Initialize Supabase client with service role key
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

    // Prepare message for the queue
    const msg = {
      user_id,
      event_id,
      grant_id: profile.nylas_grant_id,
      meeting_link: event.conference_url,
      notetaker_name: profile.notetaker_name || 'Nylas Notetaker',
      join_time: new Date(scheduled_for).getTime() / 1000 // Convert to Unix timestamp
    }

    // Calculate delay until start time
    const delaySeconds = Math.max(
      0,
      Math.floor((new Date(scheduled_for).getTime() - Date.now()) / 1000)
    )

    console.log('Queueing notetaker request:', {
      msg,
      delaySeconds,
      scheduled_for
    })

    // Add to notetaker_queue table for tracking first
    const { error: insertError } = await supabaseAdmin
      .from('notetaker_queue')
      .insert({
        user_id,
        event_id,
        scheduled_for
      })

    if (insertError) {
      console.error('Error inserting queue record:', insertError)
      throw insertError
    }

    // Queue the request using pgmq
    const { error: queueError } = await supabaseAdmin.rpc(
      'pgmq_send',
      { 
        queue_name: 'notetaker_requests',
        message_body: msg,
        delay_seconds: delaySeconds
      }
    )

    if (queueError) {
      console.error('Error queueing request:', queueError)
      // If queueing fails, remove from notetaker_queue
      await supabaseAdmin
        .from('notetaker_queue')
        .delete()
        .eq('event_id', event_id)
        .eq('user_id', user_id)
      throw queueError
    }

    return new Response(
      JSON.stringify({ message: 'Recording queued successfully' }),
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