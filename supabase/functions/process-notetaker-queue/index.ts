import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
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
    const { data: messages, error: queueError } = await supabaseClient.rpc(
      'pgmq_dequeue',
      { queue_name: 'notetaker_requests', max_count: 10 }
    )

    if (queueError) {
      console.error('Error reading from queue:', queueError)
      throw queueError
    }

    console.log(`Processing ${messages?.length || 0} messages from queue`)

    // Process each message
    for (const msg of messages || []) {
      try {
        const payload = JSON.parse(msg.message_body)
        console.log('Processing message:', payload)

        // Send notetaker to the meeting
        const response = await fetch(
          `${NYLAS_API_URL}/v3/grants/${payload.grant_id}/notetakers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              meeting_link: payload.meeting_link,
              notetaker_name: payload.notetaker_name,
              join_time: payload.join_time
            })
          }
        )

        if (!response.ok) {
          const error = await response.json()
          console.error('Nylas API error:', error)
          throw new Error('Failed to send notetaker')
        }

        const { data: notetakerData } = await response.json()
        console.log('Notetaker sent successfully:', notetakerData)

        // Update queue item status
        await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'completed',
            last_attempt: new Date().toISOString(),
            attempts: 1
          })
          .eq('event_id', payload.event_id)

        // Acknowledge the message
        await supabaseClient.rpc('pgmq_ack', {
          queue_name: 'notetaker_requests',
          message_id: msg.message_id
        })

      } catch (error) {
        console.error('Error processing message:', error)

        // Update queue item with error
        await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'error',
            error: error.message,
            last_attempt: new Date().toISOString(),
            attempts: 1
          })
          .eq('event_id', payload.event_id)

        // Return message to queue for retry
        await supabaseClient.rpc('pgmq_return', {
          queue_name: 'notetaker_requests',
          message_id: msg.message_id,
          visibility_timeout: 300 // 5 minutes
        })
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
