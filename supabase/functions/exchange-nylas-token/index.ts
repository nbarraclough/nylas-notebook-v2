// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()
    
    // Get environment variables
    const clientId = Deno.env.get('NYLAS_CLIENT_ID')
    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('Starting Nylas token exchange process...')

    // Get the origin from the request headers to construct the redirect URI
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const redirectUri = `${origin}/calendar`

    console.log('Using redirect URI:', redirectUri)

    // Exchange the code for a nylas_grant_id
    console.log('Making request to Nylas token endpoint...')
    const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('Nylas token response:', JSON.stringify(tokenData, null, 2))

    if (!tokenResponse.ok) {
      console.error('Nylas token exchange error:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange token with Nylas', details: tokenData }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: tokenResponse.status,
        }
      )
    }

    const { grant_id } = tokenData
    if (!grant_id) {
      console.error('No grant_id in Nylas response:', tokenData)
      return new Response(
        JSON.stringify({ error: 'No grant_id in Nylas response' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Successfully received grant_id from Nylas:', grant_id)

    // Create Supabase admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Decode the JWT to get the user ID
    const jwt = authHeader
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub

    if (!userId) {
      console.error('No user ID found in token')
      return new Response(
        JSON.stringify({ error: 'No user ID found in token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('Starting profile update process for user:', userId)

    // First, verify the profile exists
    console.log('Checking if profile exists...')
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nylas_grant_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error checking profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to check profile', details: profileError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!existingProfile) {
      console.error('Profile not found for user:', userId)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log('Current profile state:', JSON.stringify(existingProfile, null, 2))

    // Update user's profile with nylas_grant_id using service role client
    console.log('Updating profile with new nylas_grant_id:', grant_id)
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        nylas_grant_id: grant_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: updateError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('Profile update result:', JSON.stringify(updateData, null, 2))

    return new Response(
      JSON.stringify({ success: true, grant_id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in exchange-nylas-token:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})