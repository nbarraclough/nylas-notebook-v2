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

    // First, get count of all recordings with null mux_asset_id
    const { count: nullMuxCount } = await supabaseClient
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .is('mux_asset_id', null)

    console.log(`Found ${nullMuxCount} recordings with null mux_asset_id`)

    // Calculate timestamp from 12 hours ago
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    // Get count of old recordings with null mux_asset_id
    const { count: oldNullMuxCount } = await supabaseClient
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .is('mux_asset_id', null)
      .lt('created_at', twelveHoursAgo.toISOString())

    console.log(`Of those, ${oldNullMuxCount} are older than 12 hours`)

    // Get count of non-failed old recordings with null mux_asset_id
    const { count: nonFailedCount } = await supabaseClient
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .is('mux_asset_id', null)
      .lt('created_at', twelveHoursAgo.toISOString())
      .neq('status', 'failed')

    console.log(`Of those, ${nonFailedCount} are not already marked as failed`)

    // Update stale recordings
    const { data, error } = await supabaseClient
      .from('recordings')
      .update({ status: 'failed' })
      .is('mux_asset_id', null)
      .lt('created_at', twelveHoursAgo.toISOString())
      .neq('status', 'failed')
      .select()

    if (error) {
      console.error('Error updating stale recordings:', error)
      throw error
    }

    console.log(`Updated ${data?.length || 0} stale recordings to failed status`)
    console.log('Updated recordings:', data)

    return new Response(
      JSON.stringify({
        message: `Updated ${data?.length || 0} stale recordings to failed status`,
        updatedRecordings: data,
        diagnostics: {
          totalNullMux: nullMuxCount,
          olderThan12Hours: oldNullMuxCount,
          notAlreadyFailed: nonFailedCount
        }
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