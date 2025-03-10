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

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY = 100; // ms

interface UserGrantInfo {
  userId: string;
  email: string;
  grantId: string;
}

interface EventCounts {
  total: number;
  masters: number;
  modifiedInstances: number;
  regularInstances: number;
  standaloneEvents: number;
}

interface UserResult {
  userId: string;
  grantId: string;
  eventsProcessed: EventCounts;
  success: boolean;
  error?: string;
}

interface GrantResult {
  grantId: string;
  userCount: number;
  eventsFetched: number;
  users: UserResult[];
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchEventsFromNylas(grantId: string, startUnix: number, endUnix: number, requestId: string) {
  let allEvents = [];
  let totalEventsFetched = 0;
  let hasMorePages = true;
  let page_token = null;
  
  while (hasMorePages) {
    const queryParams = new URLSearchParams({
      calendar_id: 'primary',
      start: startUnix.toString(),
      end: endUnix.toString(),
      limit: '200',
      expand_recurring: 'true'
    });
    
    if (page_token) {
      queryParams.append('page_token', page_token);
    }

    console.log(`📅 [${requestId}] Fetching events with params:`, queryParams.toString());

    const eventsResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${grantId}/events?${queryParams}`, 
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.text();
      console.error(`❌ [${requestId}] Failed to fetch Nylas events:`, errorData);
      throw new Error(`Failed to fetch events from Nylas: ${errorData}`);
    }

    const response = await eventsResponse.json();
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error(`❌ [${requestId}] Invalid response from Nylas API:`, response);
      throw new Error('Invalid response structure from Nylas API');
    }
    
    const events = response.data;
    allEvents = allEvents.concat(events);
    page_token = response.page_token;
    totalEventsFetched += events.length;
    hasMorePages = !!page_token && events.length > 0;
    
    console.log(`📊 [${requestId}] Fetched ${events.length} events, total: ${totalEventsFetched}, page_token: ${page_token || 'none'}`);
    
    if (hasMorePages) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  return allEvents;
}

async function processEventsForUser(
  events: any[], 
  userId: string, 
  requestId: string,
  SUPABASE_URL: string,
  SUPABASE_SERVICE_ROLE_KEY: string
): Promise<EventCounts> {
  const masterEvents = events.filter(event => event.recurrence);
  const instanceEvents = events.filter(event => !event.recurrence);
  const modifiedInstances = instanceEvents.filter(event => isModifiedInstance(event));
  const regularInstances = instanceEvents.filter(event => 
    isRecurringInstance(event) && !isModifiedInstance(event)
  );
  const standaloneEvents = instanceEvents.filter(event => 
    !isRecurringInstance(event) && !isModifiedInstance(event)
  );

  console.log(`🔄 [${requestId}] Processing ${masterEvents.length} master events for user ${userId}`);
  for (const master of masterEvents) {
    await processRecurringEvent(
      master, 
      userId, 
      SUPABASE_URL, 
      SUPABASE_SERVICE_ROLE_KEY,
      requestId
    );
    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`🔄 [${requestId}] Processing ${modifiedInstances.length} modified instances for user ${userId}`);
  for (const instance of modifiedInstances) {
    await processRecurringEvent(
      instance, 
      userId, 
      SUPABASE_URL, 
      SUPABASE_SERVICE_ROLE_KEY,
      requestId
    );
    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`🔄 [${requestId}] Processing ${regularInstances.length} regular instances for user ${userId}`);
  for (const instance of regularInstances) {
    await processRecurringEvent(
      instance, 
      userId, 
      SUPABASE_URL, 
      SUPABASE_SERVICE_ROLE_KEY,
      requestId
    );
    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`🔄 [${requestId}] Processing ${standaloneEvents.length} standalone events for user ${userId}`);
  for (const event of standaloneEvents) {
    await processEvent(event, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await sleep(RATE_LIMIT_DELAY);
  }

  return {
    total: events.length,
    masters: masterEvents.length,
    modifiedInstances: modifiedInstances.length,
    regularInstances: regularInstances.length,
    standaloneEvents: standaloneEvents.length
  };
}

async function deduplicateEventsForUser(
  userId: string, 
  SUPABASE_URL: string,
  SUPABASE_SERVICE_ROLE_KEY: string,
  requestId: string
): Promise<any> {
  try {
    console.log(`🧹 [${requestId}] Starting deduplication for user: ${userId}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Find duplicate events by ical_uid for this user
    const { data, error } = await supabase
      .from('events')
      .select('ical_uid, count(*)')
      .eq('user_id', userId)
      .not('ical_uid', 'is', null)
      .group('ical_uid')
      .having('count(*)', 'gt', 1);
    
    if (error) {
      console.error(`❌ [${requestId}] Error finding duplicates:`, error);
      return { deduplicated: 0, error: error.message };
    }
    
    const duplicateIcalIds = data || [];
    console.log(`🔍 [${requestId}] Found ${duplicateIcalIds.length} duplicate sets for user ${userId}`);
    
    let totalDeduplicated = 0;
    
    for (const dup of duplicateIcalIds) {
      const icalUid = dup.ical_uid;
      
      // Get all events with this ical_uid, ordered by last_updated_at
      const { data: events, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('ical_uid', icalUid)
        .eq('user_id', userId)
        .order('last_updated_at', { ascending: false });
      
      if (fetchError) {
        console.error(`❌ [${requestId}] Error fetching duplicates for ical_uid ${icalUid}:`, fetchError);
        continue;
      }
      
      if (!events || events.length <= 1) continue;
      
      // Keep the most recently updated event
      const [keepEvent, ...deleteEvents] = events;
      const deleteIds = deleteEvents.map(e => e.id);
      
      console.log(`🔄 [${requestId}] For ical_uid ${icalUid}: keeping ${keepEvent.id}, deleting ${deleteIds.length} events`);
      
      // Update any recordings to point to the kept event
      if (deleteIds.length > 0) {
        const { error: updateError } = await supabase
          .from('recordings')
          .update({ event_id: keepEvent.id })
          .in('event_id', deleteIds);
        
        if (updateError) {
          console.error(`❌ [${requestId}] Error updating recordings:`, updateError);
          continue;
        }
        
        // Delete the duplicate events
        const { error: deleteError, count } = await supabase
          .from('events')
          .delete()
          .in('id', deleteIds);
        
        if (deleteError) {
          console.error(`❌ [${requestId}] Error deleting duplicates:`, deleteError);
          continue;
        }
        
        totalDeduplicated += count || 0;
      }
    }
    
    console.log(`✅ [${requestId}] Deduplication complete for user ${userId}: removed ${totalDeduplicated} duplicate events`);
    return { deduplicated: totalDeduplicated };
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error in deduplication process:`, error);
    return { deduplicated: 0, error: error.message };
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`🚀 [${requestId}] Starting sync-nylas-events function`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { user_id, user_ids, grant_id, force_recording_rules = false, run_deduplication = true } = await req.json()
    console.log(`📝 [${requestId}] Request payload:`, { user_id, user_ids, grant_id, force_recording_rules, run_deduplication })

    const userIdsToProcess = user_ids || (user_id ? [user_id] : null)

    if (!userIdsToProcess || userIdsToProcess.length === 0) {
      throw new Error('Either user_id or user_ids is required')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const usersByGrantId = new Map<string, UserGrantInfo[]>();
    const errors: Array<{ userId: string; error: string }> = [];
    const grantResults = new Map<string, GrantResult>();
    const deduplicationResults: Array<{userId: string; result: any}> = [];

    for (const userId of userIdsToProcess) {
      try {
        console.log(`👤 [${requestId}] Processing user:`, userId);
        
        if (grant_id && userId === user_id) {
          const userInfo: UserGrantInfo = {
            userId,
            email: "user@example.com",
            grantId: grant_id
          };
          
          console.log(`📝 [${requestId}] Using provided grant ID:`, grant_id);
          
          if (!usersByGrantId.has(userInfo.grantId)) {
            usersByGrantId.set(userInfo.grantId, []);
          }
          usersByGrantId.get(userInfo.grantId)!.push(userInfo);
          continue;
        }
        
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=nylas_grant_id,email`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
          }
        );

        if (!profileResponse.ok) {
          throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`);
        }

        const profiles = await profileResponse.json();
        
        if (!profiles?.[0]?.nylas_grant_id) {
          throw new Error('No Nylas grant ID found');
        }

        const userInfo: UserGrantInfo = {
          userId,
          email: profiles[0].email,
          grantId: profiles[0].nylas_grant_id
        };

        if (!usersByGrantId.has(userInfo.grantId)) {
          usersByGrantId.set(userInfo.grantId, []);
        }
        usersByGrantId.get(userInfo.grantId)!.push(userInfo);

      } catch (error) {
        console.error(`❌ [${requestId}] Error processing user:`, userId, error);
        errors.push({ userId, error: error.message || 'Unknown error occurred' });
      }
    }

    const startDate = startOfToday();
    const endDate = addMonths(startDate, 3);
    const startUnix = getUnixTime(startDate);
    const endUnix = getUnixTime(endDate);
    
    console.log(`📅 [${requestId}] Date range:`, { 
      start: formatDate(startDate), 
      end: formatDate(endDate),
      startUnix,
      endUnix
    });

    for (const [grantId, users] of usersByGrantId.entries()) {
      try {
        if (users.length > 1) {
          console.log(`👥 [${requestId}] Processing shared grant ID ${grantId} for users:`, 
            users.map(u => u.email).join(', ')
          );
        }

        const events = await fetchEventsFromNylas(grantId, startUnix, endUnix, requestId);
        console.log(`📊 [${requestId}] Fetched ${events.length} events for grant ${grantId}`);

        const grantResult: GrantResult = {
          grantId,
          userCount: users.length,
          eventsFetched: events.length,
          users: []
        };

        for (const user of users) {
          try {
            const eventCounts = await processEventsForUser(
              events,
              user.userId,
              `${requestId}-${user.userId}`,
              SUPABASE_URL,
              SUPABASE_SERVICE_ROLE_KEY
            );

            grantResult.users.push({
              userId: user.userId,
              grantId,
              eventsProcessed: eventCounts,
              success: true
            });

          } catch (error) {
            console.error(`❌ [${requestId}] Error processing events for user:`, user.userId, error);
            grantResult.users.push({
              userId: user.userId,
              grantId,
              eventsProcessed: { total: 0, masters: 0, modifiedInstances: 0, regularInstances: 0, standaloneEvents: 0 },
              success: false,
              error: error.message
            });
          }
        }

        grantResults.set(grantId, grantResult);

      } catch (error) {
        console.error(`❌ [${requestId}] Error processing grant:`, grantId, error);
        errors.push({ 
          userId: users.map(u => u.userId).join(','), 
          error: `Grant processing failed: ${error.message}` 
        });
      }
    }

    if (run_deduplication) {
      console.log(`🧹 [${requestId}] Running deduplication process for all processed users`);
      
      for (const userId of userIdsToProcess) {
        try {
          const result = await deduplicateEventsForUser(
            userId,
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            `${requestId}-dedup-${userId}`
          );
          
          deduplicationResults.push({ userId, result });
          
        } catch (dedupError) {
          console.error(`❌ [${requestId}] Deduplication error for user ${userId}:`, dedupError);
          errors.push({ 
            userId, 
            error: `Deduplication failed: ${dedupError.message || 'Unknown error'}`
          });
        }
      }
    }

    try {
      console.log(`🧹 [${requestId}] Starting cleanup of orphaned instances`);
      const cleanup = await cleanupOrphanedInstances(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log(`✅ [${requestId}] Cleanup completed:`, cleanup);
    } catch (error) {
      console.error(`❌ [${requestId}] Cleanup error:`, error);
    }

    const response = {
      success: true,
      results: {
        grantsProcessed: grantResults.size,
        totalUsers: userIdsToProcess.length,
        grantResults: Array.from(grantResults.values()),
        deduplication: run_deduplication ? deduplicationResults : undefined
      },
      errors: errors.length > 0 ? errors : undefined
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Error in sync-nylas-events:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})
