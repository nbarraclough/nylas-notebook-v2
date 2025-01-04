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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()
    
    // Get environment variables
    const clientId = Deno.env.get('NYLAS_CLIENT_ID')
    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    console.log('Exchanging code for grant_id...')

    // Exchange the code for a grant_id using the correct Nylas API URL
    const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Nylas token exchange error:', errorData)
      throw new Error('Failed to exchange token with Nylas')
    }

    const { grant_id } = await tokenResponse.json()
    console.log('Received grant_id:', grant_id)

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Updating profile with grant_id for user:', user.id)

    // Update user's profile with grant_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ nylas_grant_id: grant_id })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      throw updateError
    }

    console.log('Successfully updated profile with grant_id')

    return new Response(
      JSON.stringify({ success: true }),
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
        status: 400,
      },
    )
  }
})