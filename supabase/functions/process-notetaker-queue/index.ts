
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { Database } from '../_shared/types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET')!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

const MAX_ATTEMPTS = 3;
const RATE_LIMIT_DELAY_MS = 1100; // 1.1 seconds between requests to be safe
const MAX_EVENT_AGE_MINS = 30;
const DEDUP_WINDOW_MINS = 30;

// Log level colors (using ANSI colors)
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
  QUEUE: '📅',
  API: '🌐',
  CHECK: '✅',
  FINISH: '🏁',
  ERROR: '❌',
  SKIP: '⏭️',
  TIME: '⏱️',
};

/**
 * Generates a structured log message with timestamp, request ID, and log level
 */
function logMessage(requestId: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' | 'SUCCESS', message: string, data?: any, action?: keyof typeof LOG_ACTIONS) {
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 8); // HH:MM:SS format
  const emoji = LOG_COLORS[level];
  const actionEmoji = action ? LOG_ACTIONS[action] + ' ' : '';
  
  const logPrefix = `${emoji} [${timestamp}][${requestId}]`;
  
  if (data) {
    console.log(`${logPrefix} ${actionEmoji}${message}`, data);
  } else {
    console.log(`${logPrefix} ${actionEmoji}${message}`);
  }
}

// Shortcut log functions
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

// Note: JWT verification is intentionally turned OFF for webhook functions
Deno.serve(async (req) => {
  // Generate a unique request ID for this processing run
  const requestId = crypto.randomUUID().substring(0, 8);
  
  logInfo(requestId, `Starting notetaker queue processing`, undefined, 'START');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get pending queue items that are not manual meetings
    logInfo(requestId, `Fetching pending queue items`, undefined, 'FETCH');
    
    const { data: queueItems, error: queueError } = await supabase
      .from('notetaker_queue')
      .select(`
        *,
        events!inner(
          id,
          conference_url,
          manual_meeting_id,
          start_time,
          user_id,
          profiles!inner(
            nylas_grant_id,
            notetaker_name
          )
        )
      `)
      .eq('status', 'pending')
      .is('events.manual_meeting_id', null)
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (queueError) {
      logError(requestId, `Failed to fetch queue items`, queueError, 'ERROR');
      throw queueError;
    }

    logInfo(requestId, `Found ${queueItems?.length || 0} queue items to process`, undefined, 'FETCH');

    if (!queueItems?.length) {
      return new Response(JSON.stringify({ message: 'No items to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Process items sequentially with delay between each
    const processedItems = [];
    for (const item of queueItems) {
      const itemRequestId = `${requestId}-${item.id.substring(0, 6)}`;
      try {
        logInfo(itemRequestId, `Processing queue item for event`, { 
          queueId: item.id, 
          eventId: item.events.id,
          attempts: item.attempts || 0,
          scheduledFor: item.scheduled_for
        }, 'PROCESS');
        
        // Check if event started more than 30 minutes ago
        const eventStartTime = new Date(item.events.start_time);
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - MAX_EVENT_AGE_MINS);
        
        logDebug(itemRequestId, `Checking event age`, {
          eventTime: eventStartTime.toISOString(),
          cutoffTime: cutoffTime.toISOString(),
          maxAgeMins: MAX_EVENT_AGE_MINS
        }, 'CHECK');
        
        if (eventStartTime < cutoffTime) {
          logWarn(itemRequestId, `Event started over ${MAX_EVENT_AGE_MINS} minutes ago, marking as failed`, {
            eventId: item.events.id,
            startTime: eventStartTime.toISOString(),
            cutoffTime: cutoffTime.toISOString()
          }, 'SKIP');
          
          const { error: updateError } = await supabase
            .from('notetaker_queue')
            .update({
              status: 'failed',
              error: `Event started over ${MAX_EVENT_AGE_MINS} minutes ago`,
              last_attempt: new Date().toISOString(),
              attempts: (item.attempts || 0) + 1
            })
            .eq('id', item.id);

          if (updateError) {
            logError(itemRequestId, `Failed to update queue item status`, updateError, 'ERROR');
            throw updateError;
          }

          processedItems.push({
            queueId: item.id,
            status: 'failed',
            error: `Event started over ${MAX_EVENT_AGE_MINS} minutes ago`,
            attempts: (item.attempts || 0) + 1
          });
          
          continue;
        }

        // Check for recent notetakers sent to the same meeting URL by this user
        const dedupWindow = new Date();
        dedupWindow.setMinutes(dedupWindow.getMinutes() - DEDUP_WINDOW_MINS);

        logDebug(itemRequestId, `Checking for duplicate notetakers in the last ${DEDUP_WINDOW_MINS} minutes`, {
          conferenceUrl: item.events.conference_url,
          userId: item.events.user_id,
          dedupWindow: dedupWindow.toISOString()
        }, 'CHECK');

        const { data: recentNotetakers } = await supabase
          .from('notetaker_queue')
          .select(`
            id,
            events!inner(
              conference_url,
              user_id
            )
          `)
          .eq('events.conference_url', item.events.conference_url)
          .eq('events.user_id', item.events.user_id)
          .eq('status', 'completed')
          .gt('last_attempt', dedupWindow.toISOString())
          .not('notetaker_id', 'is', null);

        if (recentNotetakers && recentNotetakers.length > 0) {
          logWarn(itemRequestId, `Found recent notetaker for meeting URL`, {
            conferenceUrl: item.events.conference_url,
            userId: item.events.user_id,
            recentNotetakersCount: recentNotetakers.length
          }, 'SKIP');
          
          const { error: updateError } = await supabase
            .from('notetaker_queue')
            .update({
              status: 'failed',
              error: `Notetaker already sent to this meeting URL in the last ${DEDUP_WINDOW_MINS} minutes`,
              last_attempt: new Date().toISOString(),
              attempts: (item.attempts || 0) + 1
            })
            .eq('id', item.id);

          if (updateError) {
            logError(itemRequestId, `Failed to update queue item status for duplicate`, updateError, 'ERROR');
            throw updateError;
          }

          processedItems.push({
            queueId: item.id,
            status: 'failed',
            error: `Duplicate meeting URL within ${DEDUP_WINDOW_MINS} minutes`,
            attempts: (item.attempts || 0) + 1
          });
          
          continue;
        }
        
        const event = item.events;
        const grantId = event.profiles.nylas_grant_id;
        const notetakerName = event.profiles.notetaker_name || 'Nylas Notetaker';

        if (!grantId) {
          throw new Error('No nylas_grant_id found for user');
        }

        if (!event.conference_url) {
          throw new Error('No conference URL found for event');
        }

        logInfo(itemRequestId, `Sending notetaker to conference`, {
          grantId,
          conferenceUrl: event.conference_url,
          notetakerName
        }, 'API');

        // Send notetaker request to Nylas
        const startApiTime = Date.now();
        const nylasResponse = await fetch(
          `https://api.us.nylas.com/v3/grants/${grantId}/notetakers`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json, application/gzip',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${nylasApiKey}`,
            },
            body: JSON.stringify({
              meeting_link: event.conference_url,
              notetaker_name: notetakerName,
            }),
          }
        );
        const apiTimeMs = Date.now() - startApiTime;
        logDebug(itemRequestId, `Nylas API response time: ${apiTimeMs}ms`, undefined, 'TIME');

        if (!nylasResponse.ok) {
          const errorText = await nylasResponse.text();
          logError(itemRequestId, `Nylas API error (${nylasResponse.status})`, {
            statusCode: nylasResponse.status,
            statusText: nylasResponse.statusText,
            errorText
          }, 'ERROR');
          
          const newAttempts = (item.attempts || 0) + 1;
          const updateData = {
            attempts: newAttempts,
            last_attempt: new Date().toISOString(),
            error: `Nylas API error: ${nylasResponse.statusText}`,
            status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
          };
          
          const { error: updateError } = await supabase
            .from('notetaker_queue')
            .update(updateData)
            .eq('id', item.id);

          if (updateError) {
            logError(itemRequestId, `Failed to update queue item status after API error`, updateError, 'ERROR');
            throw updateError;
          }

          processedItems.push({
            queueId: item.id,
            status: 'error',
            error: `Nylas API error: ${nylasResponse.statusText}`,
            attempts: newAttempts
          });
          
          if (nylasResponse.status === 429) {
            logWarn(itemRequestId, 'Rate limited, waiting longer before next request...', undefined, 'TIME');
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * 2));
            continue;
          }
        }

        const responseText = await nylasResponse.text();
        logDebug(itemRequestId, 'Raw Nylas response', { responseText }, 'API');
        
        const notetakerData = JSON.parse(responseText);
        logDebug(itemRequestId, 'Parsed Nylas response', { notetakerData }, 'API');

        const notetakerId = notetakerData.data?.id;
        if (!notetakerId) {
          throw new Error('No notetaker ID in response');
        }

        logSuccess(itemRequestId, 'Successfully created notetaker', { notetakerId }, 'API');

        // Create recording entry with notetaker_id
        logInfo(itemRequestId, 'Creating recording entry', undefined, 'PROCESS');
        const { error: recordingError } = await supabase
          .from('recordings')
          .insert({
            user_id: event.user_id,
            event_id: event.id,
            notetaker_id: notetakerId,
            status: 'waiting',
          });

        if (recordingError) {
          logError(itemRequestId, 'Failed to create recording entry', recordingError, 'ERROR');
          throw recordingError;
        }

        // Update queue item status with notetaker_id
        logInfo(itemRequestId, 'Updating queue item status to completed', undefined, 'PROCESS');
        const { error: updateError } = await supabase
          .from('notetaker_queue')
          .update({
            status: 'completed',
            notetaker_id: notetakerId,
            last_attempt: new Date().toISOString()
          })
          .eq('id', item.id);

        if (updateError) {
          logError(itemRequestId, 'Failed to update queue item status', updateError, 'ERROR');
          throw updateError;
        }

        processedItems.push({
          queueId: item.id,
          status: 'success',
          notetakerId: notetakerId,
        });

        logInfo(itemRequestId, `Waiting ${RATE_LIMIT_DELAY_MS}ms before next request...`, undefined, 'TIME');
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

      } catch (error) {
        logError(itemRequestId, `Error processing queue item ${item.id}`, {
          error: error.message,
          stack: error.stack
        }, 'ERROR');

        const newAttempts = (item.attempts || 0) + 1;
        const updateData = {
          attempts: newAttempts,
          last_attempt: new Date().toISOString(),
          error: error.message,
          status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
        };

        await supabase
          .from('notetaker_queue')
          .update(updateData)
          .eq('id', item.id);

        processedItems.push({
          queueId: item.id,
          status: 'error',
          error: error.message,
          attempts: newAttempts
        });
      }
    }

    logSuccess(requestId, `Finished processing queue items`, { 
      totalProcessed: processedItems.length,
      results: processedItems.map(item => ({ queueId: item.queueId, status: item.status }))
    }, 'FINISH');

    return new Response(JSON.stringify({ processed: processedItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    logError(requestId, 'Error processing queue', {
      error: error.message,
      stack: error.stack
    }, 'ERROR');
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
