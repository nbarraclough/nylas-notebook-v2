import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Checking for stale recordings...')

    // Calculate timestamp from 12 hours ago
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    // Update stale recordings
    const { data, error } = await supabaseClient
      .from('recordings')
      .update({ status: 'failed' })
      .eq('status', 'processing')
      .is('mux_asset_id', null)
      .lt('updated_at', twelveHoursAgo.toISOString())
      .select()

    if (error) {
      console.error('Error updating stale recordings:', error)
      throw error
    }

    console.log(`Updated ${data?.length || 0} stale recordings to failed status`)

    return new Response(
      JSON.stringify({
        message: `Updated ${data?.length || 0} stale recordings to failed status`,
        updatedRecordings: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})