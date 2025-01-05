import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { meetingUrl, grantId, meetingId } = await req.json()
    console.log('Received request with:', { meetingUrl, grantId, meetingId })

    if (!meetingUrl || !grantId || !meetingId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching event details...')
    // Get user's profile for notetaker name
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select(`
        *,
        profiles:user_id (
          notetaker_name
        )
      `)
      .eq('id', meetingId)
      .maybeSingle()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      throw new Error('Failed to fetch event details')
    }

    if (!event) {
      console.error('Event not found:', meetingId)
      throw new Error('Event not found')
    }

    console.log('Event data:', event)
    console.log('Sending notetaker to meeting...')

    // Send notetaker to the meeting
    const response = await fetch(
      `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/gzip'
        },
        body: JSON.stringify({
          meeting_link: meetingUrl,
          notetaker_name: event.profiles?.notetaker_name || 'Nylas Notetaker'
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Nylas API error:', errorText)
      throw new Error(`Failed to send notetaker: ${errorText}`)
    }

    const data = await response.json()
    console.log('Nylas API response:', data)

    // Update the notetaker queue with the notetaker_id
    const { error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .update({ 
        notetaker_id: data.data.notetaker_id,
        status: 'sent'
      })
      .eq('event_id', meetingId)

    if (queueError) {
      console.error('Error updating notetaker queue:', queueError)
      throw new Error('Failed to update notetaker queue')
    }

    // Create a recording entry with the notetaker_id
    const { error: recordingError } = await supabaseClient
      .from('recordings')
      .insert({
        user_id: event.user_id,
        event_id: meetingId,
        notetaker_id: data.data.notetaker_id,
        recording_url: '',
        status: 'pending'
      })

    if (recordingError) {
      console.error('Error creating recording:', recordingError)
      throw new Error('Failed to create recording entry')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notetaker_id: data.data.notetaker_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-notetaker:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})