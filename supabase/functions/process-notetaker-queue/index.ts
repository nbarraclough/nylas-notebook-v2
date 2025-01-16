import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors';
import { Database } from '../_shared/types';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

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
            nylas_grant_id
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

    const processedItems = await Promise.all(
      queueItems.map(async (item) => {
        try {
          const event = item.events;
          const grantId = event.profiles.nylas_grant_id;

          if (!grantId) {
            throw new Error('No grant ID found for user');
          }

          if (!event.conference_url) {
            throw new Error('No conference URL found for event');
          }

          // Send notetaker request to Nylas
          const nylasResponse = await fetch(
            `https://api-staging.us.nylas.com/v3/grants/${grantId}/notetaker`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
              },
              body: JSON.stringify({
                meeting_url: event.conference_url,
              }),
            }
          );

          if (!nylasResponse.ok) {
            throw new Error(`Nylas API error: ${nylasResponse.statusText}`);
          }

          const notetakerData = await nylasResponse.json();

          // Create recording entry
          const { error: recordingError } = await supabase
            .from('recordings')
            .insert({
              user_id: event.user_id,
              event_id: event.id,
              recording_url: notetakerData.recording_url,
              notetaker_id: notetakerData.id,
              status: 'waiting',
            });

          if (recordingError) {
            throw recordingError;
          }

          // Update queue item status
          const { error: updateError } = await supabase
            .from('notetaker_queue')
            .update({
              status: 'completed',
              notetaker_id: notetakerData.id,
            })
            .eq('id', item.id);

          if (updateError) {
            throw updateError;
          }

          return {
            queueId: item.id,
            status: 'success',
            notetakerId: notetakerData.id,
          };
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);

          // Update queue item with error
          await supabase
            .from('notetaker_queue')
            .update({
              status: 'failed',
              error: error.message,
              attempts: (item.attempts || 0) + 1,
              last_attempt: new Date().toISOString(),
            })
            .eq('id', item.id);

          return {
            queueId: item.id,
            status: 'error',
            error: error.message,
          };
        }
      })
    );

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