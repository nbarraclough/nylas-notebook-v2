
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { Database } from '../_shared/types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET')!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

// Log level colors
const LOG_COLORS = {
  INFO: '📘',
  DEBUG: '📔',
  WARN: '📙',
  ERROR: '📕',
  SUCCESS: '📗',
};

// Log action emojis
const LOG_ACTIONS = {
  START: '🚀',
  FETCH: '🔍',
  PROCESS: '⚙️',
  API: '🌐',
  CHECK: '✅',
  FINISH: '🏁',
  ERROR: '❌',
  SKIP: '⏭️',
};

function logMessage(requestId: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' | 'SUCCESS', message: string, data?: any, action?: keyof typeof LOG_ACTIONS) {
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
  const emoji = LOG_COLORS[level];
  const actionEmoji = action ? LOG_ACTIONS[action] + ' ' : '';
  
  const logPrefix = `${emoji} [${timestamp}][${requestId}]`;
  
  if (data) {
    console.log(`${logPrefix} ${actionEmoji}${message}`, data);
  } else {
    console.log(`${logPrefix} ${actionEmoji}${message}`);
  }
}

const logInfo = (requestId: string, message: string, data?: any, action?: keyof typeof LOG_ACTIONS) => 
  logMessage(requestId, 'INFO', message, data, action);

const logDebug = (requestId: string, message: string, data?: any, action?: keyof typeof LOG_ACTIONS) => 
  logMessage(requestId, 'DEBUG', message, data, action);

const logWarn = (requestId: string, message: string, data?: any, action?: keyof typeof LOG_ACTIONS) => 
  logMessage(requestId, 'WARN', message, data, action);

const logError = (requestId: string, message: string, data?: any, action?: keyof typeof LOG_ACTIONS) => 
  logMessage(requestId, 'ERROR', message, data, action);

const logSuccess = (requestId: string, message: string, data?: any, action?: keyof typeof LOG_ACTIONS) => 
  logMessage(requestId, 'SUCCESS', message, data, action);

Deno.serve(async (req) => {
  // Generate a unique request ID
  const requestId = crypto.randomUUID().substring(0, 8);
  
  logInfo(requestId, `Starting create-notetaker function`, undefined, 'START');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { event_id, join_time, meeting_settings } = await req.json();
    
    if (!event_id) {
      throw new Error('Missing required parameter: event_id');
    }
    
    logInfo(requestId, `Processing request`, { event_id, join_time }, 'PROCESS');

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        profiles:user_id (
          nylas_grant_id,
          notetaker_name,
          record_internal_meetings,
          record_external_meetings
        )
      `)
      .eq('id', event_id)
      .single();

    if (eventError) {
      logError(requestId, `Failed to fetch event details`, eventError, 'ERROR');
      throw new Error(`Failed to fetch event details: ${eventError.message}`);
    }

    if (!event) {
      logError(requestId, `Event not found`, { event_id }, 'ERROR');
      throw new Error('Event not found');
    }

    logDebug(requestId, `Event details retrieved`, { 
      event_id: event.id,
      title: event.title,
      conference_url: event.conference_url
    }, 'FETCH');

    // Verify grant ID
    const grantId = event.profiles.nylas_grant_id;
    if (!grantId) {
      logError(requestId, `No Nylas grant ID found for user`, { user_id: event.user_id }, 'ERROR');
      throw new Error('No Nylas grant ID found for user');
    }

    // Verify conference URL
    if (!event.conference_url) {
      logError(requestId, `No conference URL found for event`, { event_id }, 'ERROR');
      throw new Error('No conference URL found for event');
    }

    // Check recording rules (unless it's a manual meeting)
    if (!event.manual_meeting_id) {
      // Extract organizer domain
      const organizerEmail = event.organizer?.email || '';
      const organizerDomain = organizerEmail.split('@')[1] || '';
      
      // Check if all participants are from the same domain (internal meeting)
      let isInternalMeeting = true;
      if (Array.isArray(event.participants)) {
        for (const participant of event.participants) {
          const participantEmail = participant.email || '';
          const participantDomain = participantEmail.split('@')[1] || '';
          
          if (participantDomain && organizerDomain && participantDomain !== organizerDomain) {
            isInternalMeeting = false;
            break;
          }
        }
      }
      
      // Apply recording rules
      const shouldRecord = isInternalMeeting 
        ? event.profiles.record_internal_meetings 
        : event.profiles.record_external_meetings;
      
      if (!shouldRecord) {
        logWarn(requestId, `Recording rules do not allow recording this event`, {
          isInternalMeeting,
          record_internal: event.profiles.record_internal_meetings,
          record_external: event.profiles.record_external_meetings
        }, 'SKIP');
        
        throw new Error('Recording rules do not allow recording this event');
      }
    }

    const notetakerName = event.profiles.notetaker_name || 'Nylas Notetaker';
    
    // Prepare meeting settings
    const defaultSettings = {
      video_recording: true,
      audio_recording: true,
      transcription: true
    };

    const finalMeetingSettings = meeting_settings || defaultSettings;
    
    // Prepare request body for Nylas API
    const nylasRequestBody: Record<string, any> = {
      meeting_link: event.conference_url,
      notetaker_name: notetakerName,
      meeting_settings: finalMeetingSettings
    };
    
    // Add join_time if provided
    if (join_time) {
      nylasRequestBody.join_time = join_time;
    }

    logInfo(requestId, `Sending notetaker to conference`, {
      grantId,
      conferenceUrl: event.conference_url,
      notetakerName,
      join_time,
      meeting_settings: finalMeetingSettings
    }, 'API');

    // Send notetaker request to Nylas
    const nylasResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/notetakers`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/gzip',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nylasApiKey}`,
        },
        body: JSON.stringify(nylasRequestBody),
      }
    );

    if (!nylasResponse.ok) {
      const errorText = await nylasResponse.text();
      logError(requestId, `Nylas API error (${nylasResponse.status})`, {
        statusCode: nylasResponse.status,
        statusText: nylasResponse.statusText,
        errorText
      }, 'ERROR');
      
      throw new Error(`Nylas API error: ${nylasResponse.statusText}`);
    }

    const responseText = await nylasResponse.text();
    const notetakerData = JSON.parse(responseText);
    
    const notetakerId = notetakerData.data?.id;
    if (!notetakerId) {
      logError(requestId, 'No notetaker ID in response', { responseData: notetakerData }, 'ERROR');
      throw new Error('No notetaker ID in response');
    }

    logSuccess(requestId, 'Successfully created notetaker', { notetakerId }, 'API');

    // Create or update recording entry with notetaker_id and join_time
    const { data: existingRecording } = await supabase
      .from('recordings')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', event.user_id)
      .maybeSingle();

    if (existingRecording) {
      // Update existing recording
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          notetaker_id: notetakerId,
          join_time: join_time ? new Date(join_time * 1000).toISOString() : null,
          meeting_settings: finalMeetingSettings,
          status: 'waiting',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecording.id);

      if (updateError) {
        logError(requestId, 'Failed to update recording entry', updateError, 'ERROR');
        throw updateError;
      }
    } else {
      // Create new recording entry
      const { error: recordingError } = await supabase
        .from('recordings')
        .insert({
          user_id: event.user_id,
          event_id: event.id,
          notetaker_id: notetakerId,
          join_time: join_time ? new Date(join_time * 1000).toISOString() : null,
          meeting_settings: finalMeetingSettings,
          status: 'waiting',
        });

      if (recordingError) {
        logError(requestId, 'Failed to create recording entry', recordingError, 'ERROR');
        throw recordingError;
      }
    }

    // Clean up any pending queue items for this event
    await supabase
      .from('notetaker_queue')
      .delete()
      .eq('event_id', event.id)
      .eq('user_id', event.user_id);

    logSuccess(requestId, `Function completed successfully`, {
      event_id,
      notetaker_id: notetakerId
    }, 'FINISH');

    return new Response(
      JSON.stringify({ 
        success: true,
        notetaker_id: notetakerId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    logError(requestId, `Error in create-notetaker function`, {
      error: error.message,
      stack: error.stack
    }, 'ERROR');
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
