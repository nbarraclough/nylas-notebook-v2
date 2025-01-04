import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Read messages from the queue
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .select(`
        *,
        profiles!notetaker_queue_user_id_fkey (
          nylas_grant_id,
          notetaker_name
        ),
        events!notetaker_queue_event_id_fkey (
          conference_url
        )
      `)
      .eq('status', 'pending')
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Processing ${queueItems?.length || 0} pending notetaker requests`)

    // Process each queue item
    for (const item of queueItems || []) {
      try {
        const profile = item.profiles
        const event = item.events

        if (!profile?.nylas_grant_id || !event?.conference_url) {
          console.error('Missing required data:', { 
            grantId: profile?.nylas_grant_id, 
            conferenceUrl: event?.conference_url 
          })
          continue
        }

        // Prepare the notetaker request payload
        const notetakerPayload = {
          meeting_link: event.conference_url,
          notetaker_name: profile.notetaker_name || 'Nylas Notetaker'
        }

        console.log('Sending notetaker request:', {
          grantId: profile.nylas_grant_id,
          payload: notetakerPayload
        })

        // Send notetaker to the meeting
        const response = await fetch(
          `${NYLAS_API_URL}/v3/grants/${profile.nylas_grant_id}/notetakers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(notetakerPayload)
          }
        )

        const responseData = await response.json()

        if (!response.ok) {
          console.error('Nylas API error:', responseData)
          throw new Error(responseData.message || 'Failed to send notetaker')
        }

        console.log('Notetaker sent successfully:', responseData)

        // Update queue item status
        await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'completed',
            last_attempt: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
          .eq('id', item.id)

      } catch (error) {
        console.error('Error processing queue item:', error)

        // Update queue item with error
        await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'failed',
            error: error.message,
            last_attempt: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
          .eq('id', item.id)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Queue processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-notetaker-queue:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})