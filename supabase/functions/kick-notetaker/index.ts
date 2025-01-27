import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { notetakerId } = await req.json()
    console.log('🚀 Starting kick-notetaker process for notetakerId:', notetakerId)

    if (!notetakerId) {
      throw new Error('notetakerId is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Finding recording with notetaker:', notetakerId)
    // Find the recording with this notetaker
    const { data: recordingData, error: recordingError } = await supabaseClient
      .from('recordings')
      .select('id, user_id')
      .eq('notetaker_id', notetakerId)
      .maybeSingle()

    if (recordingError) {
      console.error('❌ Error fetching recording:', recordingError)
      throw new Error('Failed to fetch recording')
    }

    if (!recordingData) {
      console.log('⚠️ No recording found with notetaker ID:', notetakerId)
      throw new Error('No recording found with this notetaker ID')
    }

    console.log('✅ Found recording:', recordingData)

    console.log('🔍 Getting user profile for Nylas grant ID...')
    // Get the user's Nylas grant ID
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', recordingData.user_id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      throw new Error('Failed to fetch profile')
    }

    if (!profileData.nylas_grant_id) {
      console.error('❌ No Nylas grant ID found for user:', recordingData.user_id)
      throw new Error('No Nylas grant ID found for user')
    }

    console.log('📡 Sending kick request to Nylas API...')
    console.log('Grant ID:', profileData.nylas_grant_id)
    console.log('Notetaker ID:', notetakerId)

    // Send kick request to Nylas using the correct /cancel endpoint
    const response = await fetch(
      `https://api.us.nylas.com/v3/grants/${profileData.nylas_grant_id}/notetakers/${notetakerId}/cancel`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
          'Accept': 'application/json, application/gzip'
        }
      }
    )

    // Log the raw response for debugging
    const responseText = await response.text()
    console.log('📥 Nylas API Response Status:', response.status)
    console.log('📥 Nylas API Response Body:', responseText)

    if (!response.ok) {
      console.error('❌ Failed to kick notetaker. Status:', response.status, 'Response:', responseText)
      throw new Error(`Failed to kick notetaker: ${responseText}`)
    }

    // Try to parse as JSON if possible, otherwise use text response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('✅ Parsed JSON response:', responseData);
    } catch (e) {
      // If not JSON, use text response
      console.log('ℹ️ Using text response:', responseText);
      responseData = { message: responseText };
    }

    console.log('🔄 Updating recording status to waiting...')
    // Update recording status to waiting
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({ 
        status: 'waiting',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingData.id)

    if (updateError) {
      console.error('❌ Error updating recording:', updateError)
      throw new Error('Failed to update recording status')
    }

    console.log('✅ Successfully completed kick-notetaker process')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notetaker kicked successfully',
        response: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ Error in kick-notetaker:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to kick notetaker'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})