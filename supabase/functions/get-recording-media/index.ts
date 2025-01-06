import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api-staging.us.nylas.com';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { recordingId, notetakerId } = await req.json()
    console.log('Processing request for recording:', recordingId, 'notetaker:', notetakerId)

    if (!recordingId || !notetakerId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the recording details
    const { data: recording, error: recordingError } = await supabaseClient
      .from('recordings')
      .select('*, profiles:user_id(nylas_grant_id)')
      .eq('id', recordingId)
      .single()

    if (recordingError || !recording) {
      console.error('Error fetching recording:', recordingError)
      throw new Error('Recording not found')
    }

    const grantId = recording.profiles?.nylas_grant_id
    if (!grantId) {
      throw new Error('Nylas grant ID not found')
    }

    console.log('Fetching media from Nylas for grant:', grantId)

    // Fetch media from Nylas
    const response = await fetch(
      `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers/${notetakerId}/media`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Nylas API error:', response.status, await response.text())
      
      // If media is not available yet, return a structured error response
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'MEDIA_NOT_READY',
            message: 'Media is not available yet'
          }),
          { 
            status: 202,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      throw new Error(`Failed to fetch media: ${response.statusText}`)
    }

    const mediaData = await response.json()
    console.log('Media data received:', mediaData)

    // Always update the recording with the latest media URLs
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({
        video_url: mediaData.recording?.url,
        transcript_url: mediaData.transcript?.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordingId)

    if (updateError) {
      console.error('Error updating recording:', updateError)
      throw new Error('Failed to update recording with media data')
    }

    // If there's a transcript URL, fetch and store its content
    if (mediaData.transcript?.url) {
      try {
        const transcriptResponse = await fetch(mediaData.transcript.url)
        if (transcriptResponse.ok) {
          const transcriptContent = await transcriptResponse.json()
          
          await supabaseClient
            .from('recordings')
            .update({
              transcript_content: transcriptContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', recordingId)
        }
      } catch (error) {
        console.error('Error fetching transcript content:', error)
        // Don't throw here, as we still want to return success for the media URLs
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        videoUrl: mediaData.recording?.url,
        transcriptUrl: mediaData.transcript?.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in get-recording-media:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'INTERNAL_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})