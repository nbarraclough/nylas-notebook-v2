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
    console.log('Processing notetaker request...');

    if (!meetingUrl || !grantId || !meetingId) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching event details...');
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
      console.error('Error fetching event');
      throw new Error('Failed to fetch event details')
    }

    if (!event) {
      console.error('Event not found');
      throw new Error('Event not found')
    }

    console.log('Sending notetaker to meeting...');

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
      console.error('Failed to send notetaker');
      throw new Error(`Failed to send notetaker`)
    }

    const data = await response.json()
    console.log('Notetaker sent successfully');

    // Update the notetaker queue with the notetaker_id
    const { error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .update({ 
        notetaker_id: data.data.notetaker_id,
        status: 'sent'
      })
      .eq('event_id', meetingId)

    if (queueError) {
      console.error('Error updating notetaker queue');
      throw new Error('Failed to update notetaker queue')
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
    console.error('Error in send-notetaker');
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: 'An error occurred while processing the request'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})