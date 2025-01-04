import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api.us.nylas.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get queue items that are due to be processed
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .select(`
        *,
        events (
          conference_url,
          start_time
        ),
        profiles (
          nylas_grant_id,
          notetaker_name
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Processing ${queueItems?.length || 0} queue items`)

    for (const item of queueItems || []) {
      try {
        if (!item.events?.conference_url || !item.profiles?.nylas_grant_id) {
          console.error('Missing required data for queue item:', item.id)
          continue
        }

        // Send notetaker to the meeting
        const response = await fetch(
          `${NYLAS_API_URL}/v3/grants/${item.profiles.nylas_grant_id}/notetakers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              meeting_link: item.events.conference_url,
              notetaker_name: item.profiles.notetaker_name || 'Nylas Notetaker',
              join_time: Math.floor(new Date(item.events.start_time).getTime() / 1000)
            })
          }
        )

        if (!response.ok) {
          const error = await response.json()
          console.error('Nylas API error:', error)
          throw new Error('Failed to send notetaker')
        }

        const { data: notetakerData } = await response.json()

        // Update queue item status
        await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'completed',
            last_attempt: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
          .eq('id', item.id)

        console.log('Successfully processed queue item:', item.id)

      } catch (error) {
        console.error('Error processing queue item:', item.id, error)

        // Update queue item with error
        await supabaseClient
          .from('notetaker_queue')
          .update({
            status: 'error',
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