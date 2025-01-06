// Follow this setup to create Supabase client in Edge Functions
// https://supabase.com/docs/guides/functions/connect-to-supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Get all pending queue items without notetaker_id
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .select(`
        *,
        events (
          conference_url,
          title,
          start_time,
          end_time
        ),
        profiles (
          nylas_grant_id,
          notetaker_name
        )
      `)
      .eq('status', 'pending')
      .is('notetaker_id', null)
      .lt('attempts', 3) // Only process items that haven't failed too many times
      .gt('scheduled_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Only process items scheduled within last 24 hours
      .lt('scheduled_for', new Date().toISOString()) // Only process items scheduled for now or the past

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Found ${queueItems?.length || 0} pending queue items to process`)

    if (!queueItems?.length) {
      return new Response(
        JSON.stringify({ message: 'No pending queue items found to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each queue item
    const results = await Promise.all(
      queueItems.map(async (item) => {
        console.log(`Processing queue item ${item.id} for event:`, item.events?.title)
        
        try {
          if (!item.events?.conference_url) {
            throw new Error('Conference URL not found for event')
          }

          if (!item.profiles?.nylas_grant_id) {
            throw new Error('Nylas grant ID not found for user')
          }

          console.log('Sending notetaker request to Nylas for event:', item.events.title)
          
          // Send notetaker request to Nylas
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

          const responseText = await response.text();
          console.log(`Raw Nylas API response for queue item ${item.id}:`, responseText);

          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.error('Error parsing Nylas response:', e);
            throw new Error(`Invalid JSON response from Nylas: ${responseText}`);
          }

          if (!response.ok) {
            throw new Error(`Nylas API error: ${JSON.stringify(responseData)}`)
          }

          // Update queue item with notetaker_id and status
          const { error: successError } = await supabaseClient
            .from('notetaker_queue')
            .update({
              status: 'success',
              notetaker_id: responseData.data.notetaker_id,
              attempts: (item.attempts || 0) + 1,
              last_attempt: new Date().toISOString(),
              error: null // Clear any previous errors
            })
            .eq('id', item.id)

          if (successError) {
            console.error(`Error updating queue item ${item.id} status:`, successError)
            throw successError
          }

          // Create or update recording entry
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

          // Update queue item with error but keep it pending
          const { error: updateError } = await supabaseClient
            .from('notetaker_queue')
            .update({
              attempts: (item.attempts || 0) + 1,
              last_attempt: new Date().toISOString(),
              error: error.message,
              status: (item.attempts || 0) >= 2 ? 'failed' : 'pending' // Mark as failed after 3 attempts
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