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
          conference_url,
          title
        )
      `)
      .eq('status', 'pending')
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Found ${queueItems?.length || 0} pending notetaker requests to process`)

    // Process each queue item
    for (const item of queueItems || []) {
      try {
        console.log('Processing queue item:', {
          queueId: item.id,
          eventId: item.event_id,
          scheduledFor: item.scheduled_for,
          grantId: item.profiles?.nylas_grant_id,
          conferenceUrl: item.events?.conference_url,
          eventTitle: item.events?.title
        })

        if (!item.profiles?.nylas_grant_id) {
          throw new Error('Nylas grant ID not found')
        }

        if (!item.events?.conference_url) {
          throw new Error('Conference URL not found')
        }

        // Prepare the notetaker request payload
        const notetakerPayload = {
          meeting_link: item.events.conference_url,
          notetaker_name: item.profiles.notetaker_name || 'Nylas Notetaker'
        }

        console.log('Sending notetaker request:', {
          grantId: item.profiles.nylas_grant_id,
          payload: notetakerPayload
        })

        // Send notetaker to the meeting
        const response = await fetch(
          `${NYLAS_API_URL}/v3/grants/${item.profiles.nylas_grant_id}/notetakers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json, application/gzip'
            },
            body: JSON.stringify(notetakerPayload)
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Nylas API error:', errorText)
          throw new Error(`Failed to send notetaker: ${errorText}`)
        }

        const data = await response.json()
        console.log('Nylas API response:', data)

        // Create a new recording entry
        const { error: recordingError } = await supabaseClient
          .from('recordings')
          .insert({
            user_id: item.user_id,
            event_id: item.event_id,
            notetaker_id: data.data.notetaker_id,
            recording_url: '',
            status: 'pending'
          })

        if (recordingError) {
          console.error('Error creating recording entry:', recordingError)
          throw recordingError
        }

        // Delete the queue item after successful processing
        const { error: deleteError } = await supabaseClient
          .from('notetaker_queue')
          .delete()
          .eq('id', item.id)

        if (deleteError) {
          console.error('Error deleting queue item:', deleteError)
          // Don't throw here, as the main operation was successful
        }

        console.log('Queue item processed successfully:', {
          queueId: item.id,
          eventId: item.event_id,
          notetakerId: data.data.notetaker_id
        })

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