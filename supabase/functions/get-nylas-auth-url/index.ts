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
    const { email, provider } = await req.json()
    
    // Get environment variables
    const clientId = Deno.env.get('NYLAS_CLIENT_ID')
    const clientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Missing Nylas credentials')
    }

    // Generate a random state to prevent CSRF attacks
    const state = crypto.randomUUID()

    // Construct the Nylas auth URL using the production URL
    const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth')
    authUrl.searchParams.append('client_id', clientId)
    authUrl.searchParams.append('redirect_uri', `${req.headers.get('origin')}/calendar`)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('state', state)
    authUrl.searchParams.append('login_hint', email)
    authUrl.searchParams.append('provider', provider) // Add the provider parameter

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in get-nylas-auth-url:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})