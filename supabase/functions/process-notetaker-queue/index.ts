import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting queue processing at:', new Date().toISOString())

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

    console.log(`Found ${queueItems?.length || 0} pending notetaker requests to process`)
    console.log('Queue items:', JSON.stringify(queueItems, null, 2))

    // Process each queue item
    for (const item of queueItems || []) {
      try {
        const profile = item.profiles
        const event = item.events

        console.log('Processing queue item:', {
          queueId: item.id,
          eventId: item.event_id,
          scheduledFor: item.scheduled_for,
          grantId: profile?.nylas_grant_id,
          conferenceUrl: event?.conference_url
        })

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
        console.log('Nylas API response:', responseData)

        if (!response.ok) {
          console.error('Nylas API error:', responseData)
          throw new Error(responseData.message || 'Failed to send notetaker')
        }

        console.log('Notetaker sent successfully:', responseData)

        // Update queue item status and save notetaker_id
        const { error: updateError } = await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'completed',
            last_attempt: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1,
            notetaker_id: responseData.id
          })
          .eq('id', item.id)

        if (updateError) {
          console.error('Error updating queue item:', updateError)
        }

        // Create a new recording entry
        const { error: recordingError } = await supabaseClient
          .from('recordings')
          .insert({
            user_id: item.user_id,
            event_id: item.event_id,
            notetaker_id: responseData.id,
            recording_url: '', // Will be updated when recording is ready
            status: 'pending'
          })

        if (recordingError) {
          console.error('Error creating recording entry:', recordingError)
        }

      } catch (error) {
        console.error('Error processing queue item:', error)

        // Update queue item with error
        const { error: updateError } = await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'failed',
            error: error.message,
            last_attempt: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
          .eq('id', item.id)

        if (updateError) {
          console.error('Error updating queue item status:', updateError)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Queue processed successfully',
        processed_items: queueItems?.length || 0
      }),
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