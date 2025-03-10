
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { processEvent } from "./event-processor.ts"
import { deduplicateEvents } from "../_shared/recurring-event-utils.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      status: 204,
    })
  }

  const requestId = crypto.randomUUID();
  console.log(`🚀 [${requestId}] sync-nylas-events function started`);

  try {
    const requestData = await req.json();
    
    // Handle both camelCase and snake_case parameter formats for compatibility
    const userId = requestData.userId || requestData.user_id;
    const events = requestData.events || [];
    const syncToken = requestData.syncToken;

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`📊 [${requestId}] Processing events for user ${userId}`);
    
    // If no events were provided but there's a grant ID, we might need to fetch events
    if ((!events || events.length === 0) && requestData.grant_id) {
      console.log(`ℹ️ [${requestId}] No events provided but grant_id present`);
      // Future enhancement: Fetch events using the grant_id if needed
      return new Response(
        JSON.stringify({
          success: true,
          message: "No events to process",
          syncToken: syncToken
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          status: 200,
        }
      );
    }

    if (!events || !Array.isArray(events)) {
      throw new Error('Events array is required');
    }

    console.log(`📊 [${requestId}] Processing ${events.length} events for user ${userId}`);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Process each event
    const processingPromises = events.map(event => 
      processEvent(event, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    );
    
    await Promise.all(processingPromises);
    
    console.log(`✅ [${requestId}] Successfully processed all events`);

    // Run deduplication after syncing events
    console.log(`🧹 [${requestId}] Running deduplication for events`);
    const deduplicationResult = await deduplicateEvents(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, requestId);
    
    if (deduplicationResult.success) {
      console.log(`✅ [${requestId}] Deduplication complete: removed ${deduplicationResult.count} duplicates`);
    } else {
      console.error(`⚠️ [${requestId}] Deduplication issues:`, deduplicationResult.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${events.length} events and removed ${deduplicationResult.count || 0} duplicates`,
        syncToken: syncToken
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error(`❌ [${requestId}] Error in sync-nylas-events:`, error.stack || error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      },
    )
  }
})
