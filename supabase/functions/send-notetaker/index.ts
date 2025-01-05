import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { meetingUrl, grantId, meetingId } = await req.json()
    console.log('Received request:', { meetingUrl, grantId, meetingId })

    if (!meetingUrl || !grantId || !meetingId) {
      throw new Error('Missing required parameters')
    }

    // Send notetaker to the meeting using Nylas API
    console.log('Sending request to Nylas API:', {
      url: `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      meetingUrl
    })

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
          notetaker_name: 'Nylas Notetaker'
        })
      }
    )

    const responseData = await response.json()
    console.log('Nylas API response:', responseData)

    if (!response.ok) {
      throw new Error(responseData.message || `Failed to send notetaker: ${response.status}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notetaker_id: responseData.data.notetaker_id
      }),
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