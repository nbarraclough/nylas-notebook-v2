import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookEvent {
  delta: {
    date: number;
    object: string;
    type: string;
    object_data?: Record<string, any>;
    previous?: Record<string, any>;
    grant_id?: string;
  };
  triggers: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Handle Nylas webhook challenge
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge')
    if (challenge) {
      console.log('Responding to Nylas webhook challenge:', challenge)
      return new Response(challenge, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get webhook data
    const webhookEvent: WebhookEvent = await req.json()
    console.log('Received webhook event:', webhookEvent)

    const { delta } = webhookEvent
    const grantId = delta.grant_id

    // If we have a grant_id, check if we have a matching profile
    if (grantId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('nylas_grant_id', grantId)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking profile:', profileError)
        throw profileError
      }

      // If we don't have a matching profile, log and return early
      if (!profile) {
        console.log(`No profile found for grant_id: ${grantId}. Skipping webhook processing.`)
        return new Response(
          JSON.stringify({ message: 'No matching profile found for grant_id' }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Handle different webhook events
    switch (delta.type) {
      case 'event.created':
        if (delta.object_data) {
          console.log('Processing event.created:', delta.object_data)
          // Find user for this grant and trigger a sync
          const { error: syncError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('nylas_grant_id', grantId)
            .single()

          if (syncError) {
            console.error('Error finding user for grant:', syncError)
            throw syncError
          }
        }
        break

      case 'event.updated':
        if (delta.object_data) {
          console.log('Processing event.updated:', delta.object_data)
          // Trigger a sync to get the latest event data
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('nylas_grant_id', grantId)
            .single()

          if (updateError) {
            console.error('Error finding user for grant:', updateError)
            throw updateError
          }
        }
        break

      case 'event.deleted':
        if (delta.object_data?.id) {
          console.log('Processing event.deleted:', delta.object_data.id)
          // Delete the event from our database
          const { error: deleteError } = await supabaseAdmin
            .from('events')
            .delete()
            .eq('nylas_event_id', delta.object_data.id)

          if (deleteError) {
            console.error('Error deleting event:', deleteError)
            throw deleteError
          }
        }
        break

      case 'grant.created':
      case 'grant.updated':
        if (grantId) {
          console.log(`Processing ${delta.type}:`, grantId)
          const { error: grantError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              grant_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('nylas_grant_id', grantId)

          if (grantError) {
            console.error(`Error updating grant status for ${delta.type}:`, grantError)
            throw grantError
          }
        }
        break

      case 'grant.deleted':
        if (grantId) {
          console.log('Processing grant.deleted:', grantId)
          const { error: deleteGrantError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              grant_status: 'revoked',
              updated_at: new Date().toISOString()
            })
            .eq('nylas_grant_id', grantId)

          if (deleteGrantError) {
            console.error('Error updating grant status:', deleteGrantError)
            throw deleteGrantError
          }
        }
        break

      case 'grant.expired':
        if (grantId) {
          console.log('Processing grant.expired:', grantId)
          const { error: expireError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              grant_status: 'error',
              updated_at: new Date().toISOString()
            })
            .eq('nylas_grant_id', grantId)

          if (expireError) {
            console.error('Error updating grant status:', expireError)
            throw expireError
          }
        }
        break

      default:
        console.log('Unhandled webhook type:', delta.type)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})