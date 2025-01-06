import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { notetakerId } = await req.json()
    console.log('Processing kick request for notetaker:', notetakerId)

    if (!notetakerId) {
      throw new Error('notetakerId is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First get the queue entry and recording that have this notetaker
    const { data: queueData, error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .select('id, event_id, user_id')
      .eq('notetaker_id', notetakerId)
      .single()

    if (queueError) {
      console.error('Error fetching queue entry:', queueError)
      throw new Error('Failed to fetch queue entry')
    }

    console.log('Found queue entry:', queueData)

    // Get the recording entry
    const { data: recordingData, error: recordingError } = await supabaseClient
      .from('recordings')
      .select('id')
      .eq('notetaker_id', notetakerId)
      .single()

    if (recordingError && recordingError.code !== 'PGRST116') { // Ignore not found error
      console.error('Error fetching recording:', recordingError)
      throw new Error('Failed to fetch recording')
    }

    console.log('Found recording:', recordingData)

    // Send kick request to Nylas
    const response = await fetch(
      `https://api-staging.us.nylas.com/v3/notetakers/${notetakerId}/kick`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to kick notetaker:', errorText)
      throw new Error(`Failed to kick notetaker: ${errorText}`)
    }

    // Try to parse as JSON first, if it fails, use text response
    let responseData;
    const responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed JSON response:', responseData);
    } catch (e) {
      // If not JSON, use text response
      console.log('Using text response:', responseText);
      responseData = { message: responseText };
    }

    console.log('Successfully kicked notetaker')

    // Update recording status if it exists
    if (recordingData) {
      const { error: updateError } = await supabaseClient
        .from('recordings')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingData.id)

      if (updateError) {
        console.error('Error updating recording:', updateError)
        throw new Error('Failed to update recording status')
      }
    }

    // Remove from queue
    const { error: deleteError } = await supabaseClient
      .from('notetaker_queue')
      .delete()
      .eq('id', queueData.id)

    if (deleteError) {
      console.error('Error removing from queue:', deleteError)
      throw new Error('Failed to remove from queue')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notetaker kicked successfully',
        response: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in kick-notetaker:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to kick notetaker'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})