import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const NYLAS_API_URL = 'https://api.us.nylas.com';

Deno.serve(async (req) => {
  // Handle CORS
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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Fetching event details...');
    // Get user's profile for notetaker name
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select(`
        *,
        profiles:user_id (
          notetaker_name
        )
      `)
      .eq('id', meetingId)
      .maybeSingle()

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

    // Send notetaker to the meeting
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

    // Calculate scheduled_for time based on event start time
    const scheduledFor = event.start_time > new Date().toISOString() 
      ? event.start_time 
      : new Date().toISOString();

    // First, get the existing queue item
    const { data: existingQueue, error: queueFetchError } = await supabaseClient
      .from('notetaker_queue')
      .select('id')
      .eq('event_id', meetingId)
      .maybeSingle();

    if (queueFetchError) {
      console.error('❌ Error fetching queue:', queueFetchError);
      throw new Error('Failed to fetch notetaker queue');
    }

    // Prepare the common data for both insert and update operations
    const queueData = {
      notetaker_id: data.data.notetaker_id,
      status: 'sent',
      scheduled_for: scheduledFor
    };

    // Update or insert the queue item
    const queueOperation = existingQueue
      ? supabaseClient
          .from('notetaker_queue')
          .update(queueData)
          .eq('id', existingQueue.id)
      : supabaseClient
          .from('notetaker_queue')
          .insert({
            ...queueData,
            event_id: meetingId,
            user_id: event.user_id
          });

    const { error: queueError } = await queueOperation;

    if (queueError) {
      console.error('❌ Error updating notetaker queue:', queueError);
      throw new Error('Failed to update notetaker queue')
    }

    console.log('✅ Successfully updated notetaker queue');

    // Create recording entry with 'waiting' status
    console.log('📝 Creating recording entry...');
    const { error: recordingError } = await supabaseClient
      .from('recordings')
      .insert({
        user_id: event.user_id,
        event_id: event.id,
        notetaker_id: data.data.notetaker_id,
        recording_url: '',
        status: 'waiting'
      });

    if (recordingError) {
      console.error('❌ Error creating recording entry:', recordingError);
      throw new Error('Failed to create recording entry')
    }

    console.log('✅ Successfully created recording entry');

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