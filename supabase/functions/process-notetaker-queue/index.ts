import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
    console.log('Processing notetaker queue...')
    
    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users with pending queue items
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
          notetaker_name
        )
      `)
      .eq('status', 'pending')
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Found ${queueItems?.length || 0} pending queue items`)

    if (!queueItems?.length) {
      return new Response(
        JSON.stringify({ message: 'No pending queue items found' }),
        { headers: { 'Content-Type': 'application/json' } }
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

          // Send notetaker request
          const response = await fetch('https://api-staging.us.nylas.com/v3/notetakers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`
            },
            body: JSON.stringify({
              name: item.profiles.notetaker_name || 'Nylas Notetaker',
              conference_url: item.events.conference_url,
              start_time: item.events.start_time,
              end_time: item.events.end_time
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`Nylas API error: ${JSON.stringify(errorData)}`)
          }

          const notetakerData = await response.json()
          console.log(`Successfully sent notetaker for queue item ${item.id}:`, notetakerData)

          // Update queue item status to success
          const { error: successError } = await supabaseClient
            .from('notetaker_queue')
            .update({
              status: 'success',
              notetaker_id: notetakerData.id
            })
            .eq('id', item.id)

          if (successError) {
            console.error(`Error updating queue item ${item.id} status:`, successError)
            throw successError
          }

          return {
            queueId: item.id,
            status: 'success',
            notetakerId: notetakerData.id
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
      { headers: { 'Content-Type': 'application/json' } }
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
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})