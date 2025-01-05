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

    // Get user's notetaker name preference
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('notetaker_name')
      .eq('nylas_grant_id', grantId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    // Send notetaker to the meeting using Nylas API
    console.log('Sending request to Nylas API:', {
      url: `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      meetingUrl,
      notetakerName: profile?.notetaker_name || 'Nylas Notetaker'
    })

    const response = await fetch(
      `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/gzip'
        },
        body: JSON.stringify({
          meeting_link: meetingUrl,
          notetaker_name: profile?.notetaker_name || 'Nylas Notetaker'
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Nylas API error:', errorText)
      throw new Error(`Failed to send notetaker: ${errorText}`)
    }

    const data = await response.json()
    console.log('Nylas API response:', data)

    // Update the notetaker queue with the notetaker_id
    const { error: queueError } = await supabaseClient
      .from('notetaker_queue')
      .update({ notetaker_id: data.data.notetaker_id })
      .eq('event_id', meetingId)

    if (queueError) {
      console.error('Error updating notetaker queue:', queueError)
      throw new Error('Failed to update notetaker queue')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notetaker_id: data.data.notetaker_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-notetaker:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})