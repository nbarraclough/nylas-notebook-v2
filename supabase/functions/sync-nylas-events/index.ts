import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { processEvent } from './event-processor.ts'
import { startOfToday, addMonths, getUnixTime, formatDate } from './timestamp-utils.ts'
import { 
  isRecurringInstance, 
  isModifiedInstance,
  processRecurringEvent,
  cleanupOrphanedInstances
} from '../_shared/recurring-event-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

serve(async (req) => {
  // Generate a unique request ID for tracking
  const requestId = crypto.randomUUID();
  console.log(`🚀 [${requestId}] Starting sync-nylas-events function`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { user_id, user_ids, force_recording_rules = false } = await req.json()
    console.log(`📝 [${requestId}] Request payload:`, { user_id, user_ids, force_recording_rules })

    const userIdsToProcess = user_ids || (user_id ? [user_id] : null)

    if (!userIdsToProcess || userIdsToProcess.length === 0) {
      throw new Error('Either user_id or user_ids is required')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const results = []
    const errors = []

    const startDate = startOfToday()
    const endDate = addMonths(startDate, 3)
    const startUnix = getUnixTime(startDate)
    const endUnix = getUnixTime(endDate)
    
    console.log(`📅 [${requestId}] Date range:`, { 
      start: formatDate(startDate), 
      end: formatDate(endDate),
      startUnix,
      endUnix
    })

    for (const userId of userIdsToProcess) {
      try {
        console.log(`👤 [${requestId}] Processing user:`, userId)
        
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=nylas_grant_id`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
          }
        )

        if (!profileResponse.ok) {
          const errorText = await profileResponse.text()
          console.error(`❌ [${requestId}] Profile fetch failed:`, {
            status: profileResponse.status,
            statusText: profileResponse.statusText,
            error: errorText
          })
          throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`)
        }

        const profiles = await profileResponse.json()
        console.log(`📝 [${requestId}] Profile response:`, profiles)

        if (!Array.isArray(profiles) || profiles.length === 0) {
          console.error(`❌ [${requestId}] No profile found for user:`, userId)
          errors.push({ userId, error: 'Profile not found' })
          continue
        }

        const profile = profiles[0]
        if (!profile?.nylas_grant_id) {
          console.error(`❌ [${requestId}] Profile found but no Nylas grant ID:`, profile)
          errors.push({ userId, error: 'No Nylas grant ID found' })
          continue
        }

        const grantId = profile.nylas_grant_id
        console.log(`🔑 [${requestId}] Found Nylas grant ID:`, grantId)

        let allEvents = []
        let totalEventsFetched = 0
        let hasMorePages = true
        let pageToken = null
        
        while (hasMorePages) {
          const queryParams = new URLSearchParams({
            calendar_id: 'primary',
            start: startUnix.toString(),
            end: endUnix.toString(),
            limit: '200',
            expand_recurring: 'true',
            ...(pageToken && { page_token: pageToken })
          })

          console.log(`Fetching events with params:`, queryParams.toString())

          const eventsResponse = await fetch(
            `https://api.us.nylas.com/v3/grants/${grantId}/events?${queryParams}`, 
            {
              headers: {
                'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            }
          )

          if (!eventsResponse.ok) {
            const errorData = await eventsResponse.text()
            console.error('Failed to fetch Nylas events:', errorData)
            errors.push({ userId, error: 'Failed to fetch events from Nylas' })
            break
          }

          const response = await eventsResponse.json()
          const events = response.data || []
          allEvents = allEvents.concat(events)
          pageToken = response.next_page_token
          totalEventsFetched += events.length
          hasMorePages = !!pageToken && events.length > 0
          
          console.log(`Fetched ${events.length} events, total: ${totalEventsFetched}`)
          
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        console.log(`Total events fetched for user ${userId}:`, allEvents.length)

        // Split events into categories
        const masterEvents = allEvents.filter(event => event.recurrence);
        const instanceEvents = allEvents.filter(event => !event.recurrence);
        const modifiedInstances = instanceEvents.filter(event => isModifiedInstance(event));
        const regularInstances = instanceEvents.filter(event => 
          isRecurringInstance(event) && !isModifiedInstance(event)
        );
        const standaloneEvents = instanceEvents.filter(event => 
          !isRecurringInstance(event) && !isModifiedInstance(event)
        );

        // Process master events first
        console.log(`Processing ${masterEvents.length} master events`);
        for (const master of masterEvents) {
          try {
            await processRecurringEvent(master, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          } catch (error) {
            console.error('Error processing master event:', {
              eventId: master.id,
              error: error.message
            });
            errors.push({ userId, eventId: master.id, error: 'Failed to process master event' });
          }
        }

        // Process modified instances
        console.log(`Processing ${modifiedInstances.length} modified instances`);
        for (const instance of modifiedInstances) {
          try {
            await processRecurringEvent(instance, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          } catch (error) {
            console.error('Error processing modified instance:', {
              eventId: instance.id,
              error: error.message
            });
            errors.push({ userId, eventId: instance.id, error: 'Failed to process modified instance' });
          }
        }

        // Process regular instances
        console.log(`Processing ${regularInstances.length} regular instances`);
        for (const instance of regularInstances) {
          try {
            await processRecurringEvent(instance, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          } catch (error) {
            console.error('Error processing regular instance:', {
              eventId: instance.id,
              error: error.message
            });
            errors.push({ userId, eventId: instance.id, error: 'Failed to process regular instance' });
          }
        }

        // Process standalone events
        console.log(`Processing ${standaloneEvents.length} standalone events`);
        for (const event of standaloneEvents) {
          try {
            await processEvent(event, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          } catch (error) {
            console.error('Error processing standalone event:', {
              eventId: event.id,
              error: error.message
            });
            errors.push({ userId, eventId: event.id, error: 'Failed to process standalone event' });
          }
        }

        results.push({ 
          userId, 
          eventsProcessed: {
            total: allEvents.length,
            masters: masterEvents.length,
            modifiedInstances: modifiedInstances.length,
            regularInstances: regularInstances.length,
            standaloneEvents: standaloneEvents.length
          }
        });

      } catch (error) {
        console.error(`❌ [${requestId}] Error processing user:`, userId, error)
        errors.push({ userId, error: error.message || 'Unknown error occurred' })
      }
    }

    try {
      const cleanup = await cleanupOrphanedInstances(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log(`🧹 [${requestId}] Cleanup result:`, cleanup);
    } catch (error) {
      console.error(`❌ [${requestId}] Cleanup error:`, error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error(`❌ [${requestId}] Error in sync-nylas-events:`, error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
