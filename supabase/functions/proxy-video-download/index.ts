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
    // Get URL from request body
    const { url } = await req.json()
    console.log('Received request to proxy URL:', url)

    if (!url) {
      console.error('No URL provided')
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch the video with proper headers
    const response = await fetch(url, {
      headers: {
        'Origin': 'https://api-staging.us.nylas.com',
        'User-Agent': 'Mozilla/5.0',
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

    // Get the video data as a blob
    const blob = await response.blob()
    
    // Return the video data directly with proper headers
    return new Response(blob, {
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'video/webm',
        'Content-Length': response.headers.get('Content-Length') || '',
        'Cache-Control': 'no-cache'
      }
    })

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