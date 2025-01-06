import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing notetaker queue...')
    
    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users with pending queue items that don't have a notetaker_id
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .select(`
        id,
        user_id,
        event_id,
        scheduled_for,
        attempts,
        events!inner (
          conference_url,
          title,
          start_time,
          end_time
        ),
        profiles!inner (
          notetaker_name,
          nylas_grant_id
        )
      `)
      .eq('status', 'pending')
      .is('notetaker_id', null)
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Found ${queueItems?.length || 0} pending queue items without notetaker_id`)

    if (!queueItems?.length) {
      return new Response(
        JSON.stringify({ message: 'No pending queue items found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each queue item
    const results = await Promise.all(
      queueItems.map(async (item) => {
        console.log(`Processing queue item ${item.id} for event: ${item.events.title}`)
        
        try {
          // Update attempts count
          const { error: updateError } = await supabaseClient
            .from('notetaker_queue')
            .update({
              attempts: (item.attempts || 0) + 1,
              last_attempt: new Date().toISOString()
            })
            .eq('id', item.id)

          if (updateError) {
            console.error(`Error updating attempts for queue item ${item.id}:`, updateError)
            throw updateError
          }

          if (!item.profiles.nylas_grant_id) {
            throw new Error('Nylas grant ID not found for user')
          }

          // Send notetaker request using the correct endpoint
          const response = await fetch(
            `https://api-staging.us.nylas.com/v3/grants/${item.profiles.nylas_grant_id}/notetakers`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, application/gzip',
                'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`
              },
              body: JSON.stringify({
                meeting_link: item.events.conference_url,
                notetaker_name: item.profiles.notetaker_name || 'Nylas Notetaker'
              })
            }
          )

          const responseData = await response.json()
          console.log(`Notetaker API response for queue item ${item.id}:`, responseData)

          if (!response.ok) {
            throw new Error(`Nylas API error: ${JSON.stringify(responseData)}`)
          }

          // Update queue item with notetaker_id and status
          const { error: successError } = await supabaseClient
            .from('notetaker_queue')
            .update({
              status: 'success',
              notetaker_id: responseData.data.notetaker_id
            })
            .eq('id', item.id)

          if (successError) {
            console.error(`Error updating queue item ${item.id} status:`, successError)
            throw successError
          }

          // Create or update recording entry with notetaker_id
          const { error: recordingError } = await supabaseClient
            .from('recordings')
            .upsert({
              user_id: item.user_id,
              event_id: item.event_id,
              notetaker_id: responseData.data.notetaker_id,
              status: 'processing',
              recording_url: responseData.data.recording_url || '',
              updated_at: new Date().toISOString()
            })

          if (recordingError) {
            console.error(`Error updating recording for queue item ${item.id}:`, recordingError)
            throw recordingError
          }

          return {
            queueId: item.id,
            status: 'success',
            notetakerId: responseData.data.notetaker_id
          }

        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error)

          // Update queue item status to error
          const { error: updateError } = await supabaseClient
            .from('notetaker_queue')
            .update({
              status: 'error',
              error: error.message
            })
            .eq('id', item.id)

          if (updateError) {
            console.error(`Error updating error status for queue item ${item.id}:`, updateError)
          }

          return {
            queueId: item.id,
            status: 'error',
            error: error.message
          }
        }
      })
    )

    return new Response(
      JSON.stringify({
        message: 'Queue processing completed',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-notetaker-queue function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})