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
      throw new Error('Missing required environment variables')
    }

    // Get the origin from the request headers to construct the redirect URI
    const origin = req.headers.get('origin') || 'http://localhost:5173'
    const redirectUri = `${origin}/calendar`

    console.log('Exchanging code for grant_id...')
    // Exchange the code for a nylas_grant_id using staging URL
    const tokenResponse = await fetch('https://api-staging.us.nylas.com/v3/connect/token', {
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

    if (!tokenResponse.ok) {
      console.error('Failed to exchange token:', tokenData)
      throw new Error(`Failed to exchange token with Nylas: ${JSON.stringify(tokenData)}`)
    }

    const { grant_id } = tokenData
    if (!grant_id) {
      throw new Error('No grant_id in Nylas response')
    }

    console.log('Getting user info from Nylas...')
    // Get user info from Nylas - Fixed URL to use /users endpoint
    const userInfoResponse = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grant_id}/users`, {
      headers: {
        'Authorization': `Bearer ${clientId}:${clientSecret}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info:', await userInfoResponse.text())
      throw new Error('Failed to get user info from Nylas')
    }

    const userInfo = await userInfoResponse.json();
    console.log('User info received:', userInfo)

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Decode the JWT to get the user ID
    const jwt = authHeader
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub

    if (!userId) {
      throw new Error('No user ID found in token')
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Updating profile with new grant info...')
    // Update the profile with new nylas_grant_id, user info, and grant status
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        nylas_grant_id: grant_id,
        grant_status: 'active', // Set status to active on successful authentication
        first_name: userInfo.name?.given_name || null,
        last_name: userInfo.name?.surname || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }

    if (!updateData) {
      throw new Error('Profile update returned no data')
    }

    console.log('Successfully updated profile with new grant info')

    // Trigger events sync
    const { error: syncError } = await supabase.functions.invoke('sync-nylas-events', {
      body: { user_id: userId }
    });

    if (syncError) {
      console.error('Error triggering events sync:', syncError)
      // Don't throw here, as the authentication was successful
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        grant_id,
        profile: updateData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error during Nylas authentication:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})