import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Proxying video download for URL:', url)

    // Fetch the video with proper headers
    const response = await fetch(url, {
      headers: {
        'Origin': 'https://api-staging.us.nylas.com',
        'User-Agent': 'Notebook/1.0',
        'Accept': '*/*',
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch video:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch video',
          status: response.status,
          statusText: response.statusText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully fetched video, returning signed URL')

    // Return the signed URL with CORS headers
    return new Response(
      JSON.stringify({ url: response.url }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in proxy-video-download:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})