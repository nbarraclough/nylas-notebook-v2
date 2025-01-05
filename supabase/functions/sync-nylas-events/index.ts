import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { processEvent } from './event-processor.ts'
import { startOfToday, addMonths, getUnixTime, formatDate } from './timestamp-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, user_ids, force_recording_rules = false } = await req.json()
    console.log('Request payload:', { user_id, user_ids, force_recording_rules })

    const userIdsToProcess = user_ids || (user_id ? [user_id] : null)

    if (!userIdsToProcess || userIdsToProcess.length === 0) {
      throw new Error('Either user_id or user_ids is required')
    }

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

    const results = []
    const errors = []

    // Get date range - now explicitly set to 3 months
    const startDate = startOfToday()
    const endDate = addMonths(startDate, 3)
    const startUnix = getUnixTime(startDate)
    const endUnix = getUnixTime(endDate)
    
    console.log('Date range:', { 
      start: formatDate(startDate), 
      end: formatDate(endDate),
      startUnix,
      endUnix
    })

    for (const userId of userIdsToProcess) {
      try {
        console.log('Processing user:', userId)
        
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('nylas_grant_id')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('Error fetching profile for user:', userId, profileError)
          errors.push({ userId, error: 'Failed to fetch user profile' })
          continue
        }

        if (!profile?.nylas_grant_id) {
          console.log('User has no Nylas grant ID, skipping sync:', userId)
          errors.push({ userId, error: 'No Nylas grant ID found' })
          continue
        }

        const { data: existingEvents, error: existingEventsError } = await supabaseAdmin
          .from('events')
          .select('ical_uid, last_updated_at')
          .eq('user_id', userId)

        if (existingEventsError) {
          console.error('Error fetching existing events:', existingEventsError)
          errors.push({ userId, error: 'Failed to fetch existing events' })
          continue
        }

        const existingEventsMap = new Map(
          existingEvents?.map(event => [event.ical_uid, new Date(event.last_updated_at)]) || []
        )

        console.log('Fetching Nylas events for grant ID:', profile.nylas_grant_id)
        
        const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET')
        if (!NYLAS_CLIENT_SECRET) {
          console.error('NYLAS_CLIENT_SECRET environment variable is not set')
          throw new Error('Nylas client secret not configured')
        }

        let pageToken = null
        let allEvents = []
        let totalEventsFetched = 0
        
        do {
          const queryParams = new URLSearchParams({
            calendar_id: 'primary',
            start: startUnix.toString(),
            end: endUnix.toString(),
            limit: '50',
            ...(pageToken && { page_token: pageToken })
          })

          const eventsResponse = await fetch(
            `https://api-staging.us.nylas.com/v3/grants/${profile.nylas_grant_id}/events?${queryParams}`, 
            {
              headers: {
                'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
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
          allEvents = allEvents.concat(response.data || [])
          pageToken = response.next_page_token
          totalEventsFetched += response.data?.length || 0
          
          console.log(`Fetched ${response.data?.length || 0} events, total: ${totalEventsFetched}, next page token:`, pageToken)
        } while (pageToken)

        console.log(`Total events fetched for user ${userId}:`, allEvents.length)

        for (const event of allEvents) {
          try {
            await processEvent(event, existingEventsMap, userId, supabaseAdmin, force_recording_rules)
          } catch (error) {
            console.error('Error processing event:', event.id, error)
            errors.push({ userId, eventId: event.id, error: 'Failed to process event' })
          }
        }

        results.push({ userId, eventsProcessed: allEvents.length })

      } catch (error) {
        console.error('Error processing user:', userId, error)
        errors.push({ userId, error: error.message || 'Unknown error occurred' })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync-nylas-events:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})