import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const requestBody = await req.json()
    console.log('📥 Request payload:', JSON.stringify(requestBody, null, 2))
    
    const { notetakerId } = requestBody
    console.log('🎯 Received kick request for notetaker:', notetakerId)

    if (!notetakerId) {
      throw new Error('No notetaker ID provided')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user's session from the request
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
    if (authError || !user) {
      console.error('❌ Authentication error:', JSON.stringify(authError, null, 2))
      throw new Error('Unauthorized')
    }

    console.log('👤 Authenticated user:', user.id)

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.nylas_grant_id) {
      console.error('❌ Profile error:', JSON.stringify(profileError, null, 2))
      throw new Error('Nylas grant ID not found')
    }

    console.log('🔑 Found Nylas grant ID:', profile.nylas_grant_id)
    
    const nylasApiUrl = `https://api-staging.us.nylas.com/v3/grants/${profile.nylas_grant_id}/notetakers/${notetakerId}`
    console.log('🚀 Making request to Nylas API:', {
      url: nylasApiUrl,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer [REDACTED]'
      }
    })

    // Make the request to Nylas API
    const response = await fetch(
      nylasApiUrl,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        },
      }
    )

    console.log('📡 Nylas API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    const responseText = await response.text()
    console.log('📦 Raw response body:', responseText)

    if (!response.ok) {
      console.error('❌ Nylas API error:', responseText)
      throw new Error(`Failed to kick notetaker: ${response.status} - ${responseText}`)
    }

    // If the response is "notetaker is leaving meeting", consider it a success
    if (responseText === 'notetaker is leaving meeting') {
      console.log('✅ Successfully kicked notetaker:', {
        notetakerId,
        response: responseText
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          status: response.status,
          message: responseText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Try to parse JSON response if it's not the text message
    let responseBody = {}
    try {
      responseBody = JSON.parse(responseText)
      console.log('✨ Parsed response body:', JSON.stringify(responseBody, null, 2))
    } catch (e) {
      console.error('❌ Error parsing response JSON:', e)
      // If we can't parse JSON but the request was successful, return the text response
      if (response.ok) {
        responseBody = { message: responseText }
      } else {
        throw new Error('Invalid response from Nylas API')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: response.status,
        data: responseBody 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error in kick-notetaker function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})