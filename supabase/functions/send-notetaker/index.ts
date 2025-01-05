import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { meetingUrl, grantId, meetingId } = await req.json()

    if (!meetingUrl || !grantId || !meetingId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user's profile for notetaker name
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('notetaker_name')
      .single()

    if (profileError) throw profileError

    // Send notetaker to the meeting
    const response = await fetch(
      `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          meeting_link: meetingUrl,
          notetaker_name: profile.notetaker_name || 'Nylas Notetaker'
        })
      }
    )

    const responseData = await response.json()
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to send notetaker')
    }

    // Create a recording entry
    const { error: recordingError } = await supabaseClient
      .from('recordings')
      .insert({
        user_id: profile.id,
        manual_meeting_id: meetingId,
        notetaker_id: responseData.data.notetaker_id,
        recording_url: '',
        status: 'pending'
      })

    if (recordingError) throw recordingError

    return new Response(
      JSON.stringify({ success: true, notetaker_id: responseData.data.notetaker_id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-notetaker:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})