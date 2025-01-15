import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api.us.nylas.com';
const MUX_API_URL = 'https://api.mux.com/video/v1';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { recordingId, notetakerId } = await req.json()
    console.log('Processing request for recording:', recordingId, 'notetaker:', notetakerId)

    if (!recordingId || !notetakerId) {
      console.error('Missing required parameters:', { recordingId, notetakerId });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: { recordingId, notetakerId },
          type: 'VALIDATION_ERROR'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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
      return new Response(
        JSON.stringify({ 
          error: 'Recording not found',
          details: recordingError,
          type: 'NOT_FOUND'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const grantId = recording.profiles?.nylas_grant_id
    if (!grantId) {
      return new Response(
        JSON.stringify({ 
          error: 'Nylas grant ID not found',
          type: 'CONFIGURATION_ERROR'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fetching media from Nylas for grant:', grantId)
    const nylasUrl = `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers/${notetakerId}/media`;
    
    // Fetch media from Nylas
    const response = await fetch(nylasUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
      },
    })

    const responseText = await response.text();
    console.log('Raw Nylas API response:', responseText);

    if (!response.ok) {
      console.error('Nylas API error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      
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

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch media from Nylas',
          status: response.status,
          type: 'NYLAS_API_ERROR',
          details: responseText
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the JSON response
    let mediaData;
    try {
      mediaData = JSON.parse(responseText);
      console.log('Parsed Nylas media data:', mediaData);
    } catch (error) {
      console.error('Error parsing Nylas response:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON response from Nylas',
          details: error.message,
          raw: responseText
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Mux asset if we have a recording URL
    if (mediaData.recording?.url) {
      try {
        console.log('Creating Mux asset from URL:', mediaData.recording.url);
        
        const muxResponse = await fetch(`${MUX_API_URL}/assets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${Deno.env.get('MUX_TOKEN_ID')}:${Deno.env.get('MUX_TOKEN_SECRET')}`)}`,
          },
          body: JSON.stringify({
            input: mediaData.recording.url,
            playback_policy: ['public'],
          }),
        });

        if (!muxResponse.ok) {
          const muxErrorText = await muxResponse.text();
          console.error('Mux API error:', {
            status: muxResponse.status,
            body: muxErrorText
          });
          throw new Error(`Mux API error: ${muxResponse.status} ${muxErrorText}`);
        }

        const muxData = await muxResponse.json();
        console.log('Mux asset created:', muxData);

        // Update recording with Mux IDs and video URL
        const { error: updateError } = await supabaseClient
          .from('recordings')
          .update({
            video_url: mediaData.recording.url,
            transcript_url: mediaData.transcript?.url,
            mux_asset_id: muxData.data.id,
            mux_playback_id: muxData.data.playback_ids[0].id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordingId);

        if (updateError) {
          console.error('Error updating recording with Mux data:', updateError);
          throw updateError;
        }

        console.log('Successfully updated recording with Mux data');
      } catch (error) {
        console.error('Error creating Mux asset:', error);
        // Continue with the response even if Mux creation fails
        // We'll still have the original video URL
      }
    } else {
      console.log('No recording URL found in Nylas response');
      // Update recording without Mux data
      const { error: updateError } = await supabaseClient
        .from('recordings')
        .update({
          video_url: mediaData.recording?.url,
          transcript_url: mediaData.transcript?.url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordingId);

      if (updateError) {
        console.error('Error updating recording:', updateError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update recording with media data',
            details: updateError,
            type: 'DATABASE_ERROR'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // If there's a transcript URL, fetch and store its content
    if (mediaData.transcript?.url) {
      try {
        console.log('Fetching transcript content from:', mediaData.transcript.url);
        const transcriptResponse = await fetch(mediaData.transcript.url)
        if (transcriptResponse.ok) {
          const transcriptContent = await transcriptResponse.json()
          console.log('Successfully fetched transcript content');
          
          await supabaseClient
            .from('recordings')
            .update({
              transcript_content: transcriptContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', recordingId)
        } else {
          console.error('Failed to fetch transcript:', {
            status: transcriptResponse.status,
            statusText: transcriptResponse.statusText
          });
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