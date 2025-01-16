import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing notetaker queue...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
      .lt('attempts', 3)
      .gt('scheduled_for', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .lt('scheduled_for', new Date().toISOString())

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
          
          const response = await fetch(
            `https://api.us.nylas.com/v3/grants/${item.profiles.nylas_grant_id}/notetakers`,
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

          // Update queue item with notetaker_id and status using upsert
          const { error: queueUpdateError } = await supabaseClient
            .from('notetaker_queue')
            .upsert({
              id: item.id,
              status: 'sent',
              notetaker_id: responseData.data.notetaker_id,
              attempts: (item.attempts || 0) + 1,
              last_attempt: new Date().toISOString(),
              error: null
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (queueUpdateError) {
            console.error(`Error upserting queue item ${item.id}:`, queueUpdateError);
            throw queueUpdateError;
          }

          // Upsert recording entry
          const { error: recordingError } = await supabaseClient
            .from('recordings')
            .upsert({
              user_id: item.user_id,
              event_id: item.event_id,
              notetaker_id: responseData.data.notetaker_id,
              status: 'processing',
              recording_url: responseData.data.recording_url || '',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'notetaker_id',
              ignoreDuplicates: false
            });

          if (recordingError) {
            console.error(`Error upserting recording for queue item ${item.id}:`, recordingError);
            throw recordingError;
          }

          return {
            queueId: item.id,
            status: 'success',
            notetakerId: responseData.data.notetaker_id
          }

        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error)

          const newAttempts = (item.attempts || 0) + 1;
          const newStatus = newAttempts >= 3 ? 'failed' : 'pending';

          // Update queue item with error using upsert
          const { error: updateError } = await supabaseClient
            .from('notetaker_queue')
            .upsert({
              id: item.id,
              attempts: newAttempts,
              last_attempt: new Date().toISOString(),
              error: error.message,
              status: newStatus
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (updateError) {
            console.error(`Error updating error status for queue item ${item.id}:`, updateError);
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