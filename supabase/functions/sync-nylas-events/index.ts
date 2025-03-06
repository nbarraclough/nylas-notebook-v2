
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
  let nextCursor = null;
  
  while (hasMorePages) {
    const queryParams = new URLSearchParams({
      calendar_id: 'primary',
      start: startUnix.toString(),
      end: endUnix.toString(),
      limit: '200',
      expand_recurring: 'true',
      ...(nextCursor && { next_cursor: nextCursor })
    });

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
    
    // Validate response structure
    if (!response.data || !Array.isArray(response.data)) {
      console.error(`❌ [${requestId}] Invalid response from Nylas API:`, response);
      throw new Error('Invalid response structure from Nylas API');
    }
    
    const events = response.data;
    allEvents = allEvents.concat(events);
    nextCursor = response.next_cursor;
    totalEventsFetched += events.length;
    hasMorePages = !!nextCursor && events.length > 0;
    
    console.log(`📊 [${requestId}] Fetched ${events.length} events, total: ${totalEventsFetched}, nextCursor: ${nextCursor || 'none'}`);
    
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

  // Process master events first
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

  // Process modified instances
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

  // Process regular instances
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

  // Process standalone events
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
    const { user_id, user_ids, grant_id, force_recording_rules = false } = await req.json()
    console.log(`📝 [${requestId}] Request payload:`, { user_id, user_ids, grant_id, force_recording_rules })

    const userIdsToProcess = user_ids || (user_id ? [user_id] : null)

    if (!userIdsToProcess || userIdsToProcess.length === 0) {
      throw new Error('Either user_id or user_ids is required')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    // Create a map to group users by grant ID
    const usersByGrantId = new Map<string, UserGrantInfo[]>();
    const errors: Array<{ userId: string; error: string }> = [];
    const grantResults = new Map<string, GrantResult>();

    // Group users by grant ID
    for (const userId of userIdsToProcess) {
      try {
        console.log(`👤 [${requestId}] Processing user:`, userId);
        
        // If grant_id is provided and we're processing the main user_id,
        // use the provided grant_id instead of fetching it
        if (grant_id && userId === user_id) {
          const userInfo: UserGrantInfo = {
            userId,
            email: "user@example.com", // We don't need the email for processing
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

        // Add to users by grant ID map
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

    // Process events for each grant ID
    for (const [grantId, users] of usersByGrantId.entries()) {
      try {
        // Log if multiple users share this grant
        if (users.length > 1) {
          console.log(`👥 [${requestId}] Processing shared grant ID ${grantId} for users:`, 
            users.map(u => u.email).join(', ')
          );
        }

        // Fetch events once for this grant ID
        const events = await fetchEventsFromNylas(grantId, startUnix, endUnix, requestId);
        console.log(`📊 [${requestId}] Fetched ${events.length} events for grant ${grantId}`);

        const grantResult: GrantResult = {
          grantId,
          userCount: users.length,
          eventsFetched: events.length,
          users: []
        };

        // Process events for each user sharing this grant
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

    // Clean up orphaned instances
    try {
      console.log(`🧹 [${requestId}] Starting cleanup of orphaned instances`);
      const cleanup = await cleanupOrphanedInstances(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log(`✅ [${requestId}] Cleanup completed:`, cleanup);
    } catch (error) {
      console.error(`❌ [${requestId}] Cleanup error:`, error);
    }

    // Prepare final response
    const response = {
      success: true,
      results: {
        grantsProcessed: grantResults.size,
        totalUsers: userIdsToProcess.length,
        grantResults: Array.from(grantResults.values()),
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
