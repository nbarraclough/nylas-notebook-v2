import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { Database } from '../_shared/types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const nylasApiKey = Deno.env.get('NYLAS_CLIENT_SECRET')!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

const MAX_ATTEMPTS = 3;

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

    const processedItems = await Promise.all(
      queueItems.map(async (item) => {
        try {
          const event = item.events;
          const grantId = event.profiles.nylas_grant_id;
          const notetakerName = event.profiles.notetaker_name || 'Nylas Notetaker';

          if (!grantId) {
            throw new Error('No grant ID found for user');
          }

          if (!event.conference_url) {
            throw new Error('No conference URL found for event');
          }

          console.log(`Processing queue item ${item.id} for event ${event.id}`);
          console.log(`Using grant ID: ${grantId}`);
          console.log(`Conference URL: ${event.conference_url}`);

          // Send notetaker request to Nylas with correct API structure
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
              // Only set to failed if we've reached max attempts
              status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
            };
            
            const { error: updateError } = await supabase
              .from('notetaker_queue')
              .update(updateData)
              .eq('id', item.id);

            if (updateError) throw updateError;

            return {
              queueId: item.id,
              status: 'error',
              error: `Nylas API error: ${nylasResponse.statusText}`,
              attempts: newAttempts
            };
          }

          const notetakerData = await nylasResponse.json();
          console.log('Nylas API response:', notetakerData);

          if (!notetakerData.data?.id) {
            throw new Error('No id in response');
          }

          // Create recording entry with notetaker_id
          const { error: recordingError } = await supabase
            .from('recordings')
            .insert({
              user_id: event.user_id,
              event_id: event.id,
              notetaker_id: notetakerData.data.id,
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
              notetaker_id: notetakerData.data.id,
            })
            .eq('id', item.id);

          if (updateError) {
            throw updateError;
          }

          return {
            queueId: item.id,
            status: 'success',
            notetakerId: notetakerData.data.id,
          };
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);

          // Increment attempts and handle retry logic for any error
          const newAttempts = (item.attempts || 0) + 1;
          const updateData = {
            attempts: newAttempts,
            last_attempt: new Date().toISOString(),
            error: error.message,
            // Only set to failed if we've reached max attempts
            status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending'
          };

          await supabase
            .from('notetaker_queue')
            .update(updateData)
            .eq('id', item.id);

          return {
            queueId: item.id,
            status: 'error',
            error: error.message,
            attempts: newAttempts
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