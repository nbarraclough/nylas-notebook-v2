import { corsHeaders } from '../_shared/cors.ts'

console.log('Proxy video download function started');

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    console.log('Received request to proxy URL:', url);

    if (!url) {
      console.error('No URL provided');
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Instead of downloading the video, just verify the URL is accessible
    const response = await fetch(url, {
      method: 'HEAD', // Only fetch headers
      headers: {
        'Origin': 'https://api-staging.us.nylas.com',
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      }
    })

    if (!response.ok) {
      console.error('Failed to verify video URL:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify video URL',
          status: response.status,
          statusText: response.statusText
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return the original URL with content info
    return new Response(
      JSON.stringify({ 
        url,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    )

  } catch (error) {
    console.error('Error in proxy-video-download:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})