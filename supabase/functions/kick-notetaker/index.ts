
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

    // 1. Get all recordings with this notetaker_id (there might be duplicates)
    const { data: recordings, error: recordingsError } = await supabaseClient
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
      .order('created_at', { ascending: false })

    if (recordingsError) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] Error fetching recordings:`, recordingsError)
      throw new Error('Failed to fetch recording details')
    }

    if (!recordings || recordings.length === 0) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] No recordings found`)
      throw new Error('No recordings found with this notetaker ID')
    }

    console.log(`📋 [NoteTaker ID: ${notetakerId}] Found ${recordings.length} recordings with this notetaker ID`)

    // Use the most recent recording's grant ID (should be the same for all)
    const mostRecentRecording = recordings[0]
    const grantId = mostRecentRecording.profiles?.nylas_grant_id

    if (!grantId) {
      console.error(`❌ [NoteTaker ID: ${notetakerId}] No Nylas grant ID found for user`)
      throw new Error('No Nylas grant ID found for user')
    }

    console.log(`🔄 [NoteTaker ID: ${notetakerId}] Sending cancellation request to Nylas API using grant ${grantId}`)

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

    // 3. Update recording status in database - mark ALL recordings with this notetaker_id as cancelled
    for (const recording of recordings) {
      const { error: updateError } = await supabaseClient
        .from('recordings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', recording.id)

      if (updateError) {
        console.error(`❌ [NoteTaker ID: ${notetakerId}] Error updating recording ${recording.id} status:`, updateError)
        // Continue with other recordings
      } else {
        console.log(`✅ [NoteTaker ID: ${notetakerId}] Updated recording ${recording.id} status to cancelled`)
      }

      // 4. Remove from notetaker_queue if present
      if (recording.event_id) {
        const { error: queueError } = await supabaseClient
          .from('notetaker_queue')
          .delete()
          .eq('event_id', recording.event_id)
          .eq('user_id', recording.user_id)

        if (queueError) {
          console.log(`⚠️ [NoteTaker ID: ${notetakerId}] Error removing from queue for event ${recording.event_id} (non-critical):`, queueError)
          // Non-critical error, don't throw
        } else {
          console.log(`✅ [NoteTaker ID: ${notetakerId}] Removed from queue for event ${recording.event_id}`)
        }
      }
    }

    console.log(`✅ [NoteTaker ID: ${notetakerId}] Successfully cancelled notetaker and updated recording statuses`)

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
