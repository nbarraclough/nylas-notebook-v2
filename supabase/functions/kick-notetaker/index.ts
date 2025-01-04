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

    let responseBody = {}
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText)
        console.log('✨ Parsed response body:', JSON.stringify(responseBody, null, 2))
      } catch (e) {
        console.error('❌ Error parsing response JSON:', e)
        throw new Error('Invalid response from Nylas API')
      }
    }

    if (!response.ok) {
      console.error('❌ Nylas API error:', JSON.stringify(responseBody, null, 2))
      throw new Error(`Failed to kick notetaker: ${response.status} - ${responseBody.message || 'Unknown error'}`)
    }

    // Verify we got a request_id in the response
    if (!responseBody.request_id) {
      console.error('❌ Missing request_id in response:', JSON.stringify(responseBody, null, 2))
      throw new Error('Invalid response from Nylas API: missing request_id')
    }

    console.log('✅ Successfully kicked notetaker:', {
      notetakerId,
      requestId: responseBody.request_id
    })

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