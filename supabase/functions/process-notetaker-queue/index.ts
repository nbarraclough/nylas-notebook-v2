import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { Database } from '../_shared/types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET')!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

const MAX_ATTEMPTS = 3;
const RATE_LIMIT_DELAY_MS = 1100; // 1.1 seconds between requests to be safe

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get pending queue items that are not manual meetings
    const { data: queueItems, error: queueError } = await supabase
      .from('notetaker_queue')
      .select(`
        *,
        events!inner(
          id,
          conference_url,
          manual_meeting_id,
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
      throw queueError;
    }

    console.log(`Found ${queueItems?.length || 0} queue items to process`);

    if (!queueItems?.length) {
      return new Response(JSON.stringify({ message: 'No items to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Process items sequentially with delay between each
    const processedItems = [];
    for (const item of queueItems) {
      try {
        console.log(`Processing queue item ${item.id} for event ${item.events.id}`);
        
        const event = item.events;
        const grantId = event.profiles.nylas_grant_id;
        const notetakerName = event.profiles.notetaker_name || 'Nylas Notetaker';

        if (!grantId) {
          throw new Error('No nylas_grant_id found for user');
        }

        if (!event.conference_url) {
          throw new Error('No conference URL found for event');
        }

        console.log(`Using nylas_grant_id: ${grantId}`);
        console.log(`Conference URL: ${event.conference_url}`);

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
          console.error(`Nylas API error (${nylasResponse.status}):`, errorText);
          
          // Increment attempts and handle retry logic
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

          if (updateError) throw updateError;

          processedItems.push({
            queueId: item.id,
            status: 'error',
            error: `Nylas API error: ${nylasResponse.statusText}`,
            attempts: newAttempts
          });
          
          // If rate limited, wait longer before next request
          if (nylasResponse.status === 429) {
            console.log('Rate limited, waiting longer before next request...');
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * 2));
            continue;
          }
        }

        const responseText = await nylasResponse.text();
        console.log('Raw Nylas response:', responseText);
        
        const notetakerData = JSON.parse(responseText);
        console.log('Parsed Nylas response:', notetakerData);

        const notetakerId = notetakerData.data?.id;
        if (!notetakerId) {
          throw new Error('No notetaker ID in response');
        }

        console.log('Extracted notetaker ID:', notetakerId);

        // Create recording entry with notetaker_id
        const { error: recordingError } = await supabase
          .from('recordings')
          .insert({
            user_id: event.user_id,
            event_id: event.id,
            notetaker_id: notetakerId,
            status: 'waiting',
          });

        if (recordingError) {
          throw recordingError;
        }

        // Update queue item status with notetaker_id
        const { error: updateError } = await supabase
          .from('notetaker_queue')
          .update({
            status: 'completed',
            notetaker_id: notetakerId,
          })
          .eq('id', item.id);

        if (updateError) {
          throw updateError;
        }

        processedItems.push({
          queueId: item.id,
          status: 'success',
          notetakerId: notetakerId,
        });

        // Wait before processing next item to avoid rate limiting
        console.log(`Waiting ${RATE_LIMIT_DELAY_MS}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);

        // Increment attempts and handle retry logic for any error
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

    return new Response(JSON.stringify({ processed: processedItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing queue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});