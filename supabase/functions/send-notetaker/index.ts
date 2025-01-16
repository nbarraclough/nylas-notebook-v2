import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api.us.nylas.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { meetingUrl, grantId, meetingId } = await req.json()
    console.log('📥 Received notetaker request:', {
      meetingUrl,
      grantId,
      meetingId,
      timestamp: new Date().toISOString()
    });

    if (!meetingUrl || !grantId || !meetingId) {
      console.error('❌ Missing required parameters:', { meetingUrl, grantId, meetingId });
      throw new Error('Missing required parameters')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Fetching event details...');
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select(`
        *,
        profiles:user_id (
          notetaker_name
        ),
        manual_meetings!inner (
          id
        )
      `)
      .eq('id', meetingId)
      .maybeSingle()

    const isManualMeeting = event?.manual_meeting_id !== null;
    console.log('📝 Meeting type:', isManualMeeting ? 'Manual' : 'Calendar');

    if (eventError) {
      console.error('❌ Error fetching event:', eventError);
      throw new Error('Failed to fetch event details')
    }

    if (!event) {
      console.error('❌ Event not found:', { meetingId });
      throw new Error('Event not found')
    }

    console.log('📤 Preparing Nylas API request...', {
      endpoint: `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      meetingLink: meetingUrl,
      notetakerName: event.profiles?.notetaker_name || 'Nylas Notetaker'
    });

    const response = await fetch(
      `${NYLAS_API_URL}/v3/grants/${grantId}/notetakers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/gzip'
        },
        body: JSON.stringify({
          meeting_link: meetingUrl,
          notetaker_name: event.profiles?.notetaker_name || 'Nylas Notetaker'
        })
      }
    )

    const responseText = await response.text();
    console.log('📥 Raw Nylas API response:', responseText);

    if (!response.ok) {
      console.error('❌ Nylas API error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to send notetaker`)
    }

    const data = JSON.parse(responseText);
    console.log('✅ Nylas API success:', {
      notetakerId: data.data.notetaker_id,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Use upsert for recordings table
    const { error: recordingError } = await supabaseClient
      .from('recordings')
      .upsert({
        user_id: event.user_id,
        event_id: event.id,
        notetaker_id: data.data.notetaker_id,
        recording_url: '',
        status: 'waiting',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'notetaker_id',
        ignoreDuplicates: false
      });

    if (recordingError) {
      console.error('❌ Error upserting recording:', recordingError);
      throw new Error('Failed to upsert recording')
    }

    // For calendar meetings, update the queue
    if (!isManualMeeting) {
      const { error: queueError } = await supabaseClient
        .from('notetaker_queue')
        .upsert({
          user_id: event.user_id,
          event_id: event.id,
          notetaker_id: data.data.notetaker_id,
          status: 'sent',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id',
          ignoreDuplicates: false
        });

      if (queueError) {
        console.error('❌ Error upserting queue:', queueError);
        throw new Error('Failed to upsert queue')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notetaker_id: data.data.notetaker_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ Error in send-notetaker:', {
      error: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})