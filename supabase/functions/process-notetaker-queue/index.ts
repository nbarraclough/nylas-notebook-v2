
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

/**
 * Generates a structured log message with timestamp, request ID, and log level
 */
function logMessage(requestId: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [${requestId}] [${level}]`;
  
  if (data) {
    console.log(`${logPrefix} ${message}`, data);
  } else {
    console.log(`${logPrefix} ${message}`);
  }
}

Deno.serve(async (req) => {
  // Generate a unique request ID for this processing run
  const requestId = crypto.randomUUID().substring(0, 8);
  
  logMessage(requestId, 'INFO', `Starting notetaker queue processing`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get pending queue items that are not manual meetings
    logMessage(requestId, 'INFO', `Fetching pending queue items`);
    
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
      logMessage(requestId, 'ERROR', `Failed to fetch queue items`, queueError);
      throw queueError;
    }

    logMessage(requestId, 'INFO', `Found ${queueItems?.length || 0} queue items to process`);

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
        logMessage(itemRequestId, 'INFO', `Processing queue item for event`, { 
          queueId: item.id, 
          eventId: item.events.id,
          attempts: item.attempts || 0,
          scheduledFor: item.scheduled_for
        });
        
        // Check if event started more than 30 minutes ago
        const eventStartTime = new Date(item.events.start_time);
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - MAX_EVENT_AGE_MINS);
        
        if (eventStartTime < cutoffTime) {
          logMessage(itemRequestId, 'WARN', `Event started over ${MAX_EVENT_AGE_MINS} minutes ago, marking as failed`, {
            eventId: item.events.id,
            startTime: eventStartTime.toISOString(),
            cutoffTime: cutoffTime.toISOString()
          });
          
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
            logMessage(itemRequestId, 'ERROR', `Failed to update queue item status`, updateError);
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

        logMessage(itemRequestId, 'DEBUG', `Checking for duplicate notetakers in the last ${DEDUP_WINDOW_MINS} minutes`, {
          conferenceUrl: item.events.conference_url,
          userId: item.events.user_id,
          dedupWindow: dedupWindow.toISOString()
        });

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
          logMessage(itemRequestId, 'WARN', `Found recent notetaker for meeting URL`, {
            conferenceUrl: item.events.conference_url,
            userId: item.events.user_id,
            recentNotetakersCount: recentNotetakers.length
          });
          
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
            logMessage(itemRequestId, 'ERROR', `Failed to update queue item status for duplicate`, updateError);
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

        logMessage(itemRequestId, 'INFO', `Sending notetaker to conference`, {
          grantId,
          conferenceUrl: event.conference_url,
          notetakerName
        });

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
            body: JSON.stringify({
              meeting_link: event.conference_url,
              notetaker_name: notetakerName,
            }),
          }
        );

        if (!nylasResponse.ok) {
          const errorText = await nylasResponse.text();
          logMessage(itemRequestId, 'ERROR', `Nylas API error (${nylasResponse.status})`, {
            statusCode: nylasResponse.status,
            statusText: nylasResponse.statusText,
            errorText
          });
          
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
            logMessage(itemRequestId, 'ERROR', `Failed to update queue item status after API error`, updateError);
            throw updateError;
          }

          processedItems.push({
            queueId: item.id,
            status: 'error',
            error: `Nylas API error: ${nylasResponse.statusText}`,
            attempts: newAttempts
          });
          
          if (nylasResponse.status === 429) {
            logMessage(itemRequestId, 'WARN', 'Rate limited, waiting longer before next request...');
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * 2));
            continue;
          }
        }

        const responseText = await nylasResponse.text();
        logMessage(itemRequestId, 'DEBUG', 'Raw Nylas response', { responseText });
        
        const notetakerData = JSON.parse(responseText);
        logMessage(itemRequestId, 'DEBUG', 'Parsed Nylas response', { notetakerData });

        const notetakerId = notetakerData.data?.id;
        if (!notetakerId) {
          throw new Error('No notetaker ID in response');
        }

        logMessage(itemRequestId, 'INFO', 'Successfully created notetaker', { notetakerId });

        // Create recording entry with notetaker_id
        logMessage(itemRequestId, 'INFO', 'Creating recording entry');
        const { error: recordingError } = await supabase
          .from('recordings')
          .insert({
            user_id: event.user_id,
            event_id: event.id,
            notetaker_id: notetakerId,
            status: 'waiting',
          });

        if (recordingError) {
          logMessage(itemRequestId, 'ERROR', 'Failed to create recording entry', recordingError);
          throw recordingError;
        }

        // Update queue item status with notetaker_id
        logMessage(itemRequestId, 'INFO', 'Updating queue item status to completed');
        const { error: updateError } = await supabase
          .from('notetaker_queue')
          .update({
            status: 'completed',
            notetaker_id: notetakerId,
            last_attempt: new Date().toISOString()
          })
          .eq('id', item.id);

        if (updateError) {
          logMessage(itemRequestId, 'ERROR', 'Failed to update queue item status', updateError);
          throw updateError;
        }

        processedItems.push({
          queueId: item.id,
          status: 'success',
          notetakerId: notetakerId,
        });

        logMessage(itemRequestId, 'INFO', `Waiting ${RATE_LIMIT_DELAY_MS}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

      } catch (error) {
        logMessage(itemRequestId, 'ERROR', `Error processing queue item ${item.id}`, {
          error: error.message,
          stack: error.stack
        });

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

    logMessage(requestId, 'INFO', `Finished processing queue items`, { 
      totalProcessed: processedItems.length,
      results: processedItems.map(item => ({ queueId: item.queueId, status: item.status }))
    });

    return new Response(JSON.stringify({ processed: processedItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    logMessage(requestId, 'ERROR', 'Error processing queue', {
      error: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
