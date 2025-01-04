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
    console.log('Kicking notetaker:', notetakerId)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user's profile to get their Nylas grant ID
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession()
    if (authError || !session) {
      throw new Error('Unauthorized')
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile?.nylas_grant_id) {
      throw new Error('Nylas grant ID not found')
    }

    console.log('Found Nylas grant ID:', profile.nylas_grant_id)

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

    if (!response.ok) {
      const error = await response.text()
      console.error('Nylas API error:', error)
      throw new Error(`Failed to kick notetaker: ${response.status}`)
    }

    console.log('Successfully kicked notetaker')

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in kick-notetaker function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})