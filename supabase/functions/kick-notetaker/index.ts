
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { notetakerId } = await req.json()
    console.log(`🚀 [NoteTaker ID: ${notetakerId}] Processing request to kick notetaker`)

    if (!notetakerId) {
      throw new Error('notetakerId is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get the recording entry to find the user's Nylas grant ID
    const { data: recording, error: recordingError } = await supabaseClient
      .from('recordings')
      .select(`
        id,
        user_id,
        event_id,
        profiles:user_id (
          nylas_grant_id
        )
      `)
      .eq('notetaker_id', notetakerId)
      .single()

    if (recordingError) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] Error fetching recording:`, recordingError)
      throw new Error('Failed to fetch recording details')
    }

    if (!recording) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] Recording not found`)
      throw new Error('Recording not found')
    }

    const grantId = recording.profiles?.nylas_grant_id
    if (!grantId) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] No Nylas grant ID found for user`)
      throw new Error('No Nylas grant ID found for user')
    }

    console.log(`🔄 [NoteTaker ID: ${notetakerId}] Sending cancellation request to Nylas API`)

    // 2. Call Nylas API to cancel the notetaker
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/cancel`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Accept': 'application/json, application/gzip'
        }
      }
    )

    // Log the response status for debugging
    console.log(`📥 [NoteTaker ID: ${notetakerId}] Nylas API Response: ${response.status}`)
    
    // Get response body if available
    let responseBody = null
    try {
      responseBody = await response.text()
      console.log(`📥 [NoteTaker ID: ${notetakerId}] Response body:`, responseBody)
    } catch (e) {
      console.log(`📝 [NoteTaker ID: ${notetakerId}] No response body or could not parse`)
    }

    // 3. Update recording status in database
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('notetaker_id', notetakerId)

    if (updateError) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] Error updating recording status:`, updateError)
      throw new Error('Failed to update recording status')
    }

    // 4. Remove from notetaker_queue if present
    if (recording.event_id) {
      const { error: queueError } = await supabaseClient
        .from('notetaker_queue')
        .delete()
        .eq('event_id', recording.event_id)
        .eq('user_id', recording.user_id)

      if (queueError) {
        console.log(`⚠️ [NoteTaker ID: ${notetakerId}] Error removing from queue (non-critical):`, queueError)
        // Non-critical error, don't throw
      }
    }

    console.log(`✅ [NoteTaker ID: ${notetakerId}] Successfully cancelled notetaker and updated recording status`)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Error in kick-notetaker:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to cancel notetaker' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
