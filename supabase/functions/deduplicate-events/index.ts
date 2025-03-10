
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { deduplicateEvents } from '../_shared/recurring-event-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`🚀 [${requestId}] Starting deduplicate-events function`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { user_id } = await req.json();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Verify the user exists
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userCheck, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !userCheck) {
      console.error(`❌ [${requestId}] User not found:`, userError || 'No record returned');
      throw new Error('User not found');
    }

    console.log(`🔄 [${requestId}] Running deduplication for user: ${user_id}`);

    // Run the deduplication
    const result = await deduplicateEvents(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, requestId, user_id);

    // Return the results
    return new Response(
      JSON.stringify({
        success: result.success,
        message: `Deduplication completed: ${result.count || 0} duplicate events removed`,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Error in deduplicate-events:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})
