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
    const { notetakerId } = await req.json()
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
      console.error('❌ Authentication error:', authError)
      throw new Error('Unauthorized')
    }

    console.log('👤 Authenticated user:', user.id)

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.nylas_grant_id) {
      console.error('❌ Profile error:', profileError)
      throw new Error('Nylas grant ID not found')
    }

    console.log('🔑 Found Nylas grant ID:', profile.nylas_grant_id)
    console.log('🚀 Making request to Nylas API to kick notetaker...')

    // Make the request to Nylas API
    const response = await fetch(
      `https://api-staging.us.nylas.com/v3/grants/${profile.nylas_grant_id}/notetakers/${notetakerId}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json, application/gzip',
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        },
      }
    )

    let responseBody
    const responseText = await response.text()
    console.log('📡 Nylas API Response Status:', response.status)
    console.log('📡 Nylas API Response Body:', responseText)

    try {
      // Try to parse as JSON if possible
      responseBody = responseText ? JSON.parse(responseText) : {}
    } catch (e) {
      // If not JSON, use the raw text
      responseBody = { message: responseText }
    }

    if (!response.ok) {
      console.error('❌ Nylas API error:', responseBody)
      throw new Error(`Failed to kick notetaker: ${response.status} - ${responseBody.message || 'Unknown error'}`)
    }

    console.log('✅ Successfully kicked notetaker')

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