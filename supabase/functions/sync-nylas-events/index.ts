
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { processEvent } from "./event-processor.ts"
import { deduplicateEvents } from "../_shared/recurring-event-utils.ts";
import { startOfToday, addMonths, getUnixTime, formatDate } from "./timestamp-utils.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  const requestId = crypto.randomUUID();
  console.log(`🚀 [${requestId}] sync-nylas-events function started`);

  try {
    const requestData = await req.json();
    const { user_id, grant_id } = requestData;

    // Validate required parameters
    if (!user_id) {
      throw new Error('User ID is required');
    }

    if (!grant_id) {
      throw new Error('Nylas grant ID is required');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NYLAS_CLIENT_SECRET) {
      throw new Error('Missing required environment variables');
    }

    console.log(`📊 [${requestId}] Fetching events for user ${user_id} with grant ${grant_id}`);

    // Calculate time range (from today to 3 months in the future)
    const startDate = startOfToday();
    const endDate = addMonths(startDate, 3);
    
    const startTimestamp = getUnixTime(startDate);
    const endTimestamp = getUnixTime(endDate);
    
    console.log(`📅 [${requestId}] Fetching events from ${formatDate(startDate)} to ${formatDate(endDate)}`);

    // Fetch events from Nylas API
    const nylasResponse = await fetch(
      `https://api.us.nylas.com/v3/grants/${grant_id}/events?calendar_id=primary&starts_after=${startTimestamp}&ends_before=${endTimestamp}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!nylasResponse.ok) {
      const errorText = await nylasResponse.text();
      console.error(`❌ [${requestId}] Nylas API error:`, errorText);
      throw new Error(`Failed to fetch events from Nylas: ${nylasResponse.status} ${errorText}`);
    }

    const nylasData = await nylasResponse.json();
    const events = nylasData.data || [];

    console.log(`📊 [${requestId}] Received ${events.length} events from Nylas API`);

    // Process each event
    const processingPromises = events.map(event => 
      processEvent(event, user_id, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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
        results: {
          totalEvents: events.length,
          duplicatesRemoved: deduplicationResult.count || 0
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error(`❌ [${requestId}] Error in sync-nylas-events:`, error.stack || error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});
