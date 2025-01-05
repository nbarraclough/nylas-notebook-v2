import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

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
        
        // Fetch profile with nylas_grant_id
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=nylas_grant_id`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
            },
          }
        )

        if (!profileResponse.ok) {
          throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`)
        }

        const profiles = await profileResponse.json()
        const profile = profiles[0]

        if (!profile?.nylas_grant_id) {
          console.error('Error fetching profile for user:', userId, 'No Nylas grant ID found')
          errors.push({ userId, error: 'No Nylas grant ID found' })
          continue
        }

        const grantId = profile.nylas_grant_id

        console.log('Fetching Nylas events for grant ID:', grantId)
        
        const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET')
        if (!NYLAS_CLIENT_SECRET) {
          console.error('NYLAS_CLIENT_SECRET environment variable is not set')
          throw new Error('Nylas client secret not configured')
        }

        let pageToken = null
        let allEvents = []
        let totalEventsFetched = 0
        let hasMorePages = true
        
        while (hasMorePages) {
          const queryParams = new URLSearchParams({
            calendar_id: 'primary',
            start: startUnix.toString(),
            end: endUnix.toString(),
            limit: '200',
            expand_recurring: 'true',
            ...(pageToken && { page_token: pageToken })
          })

          console.log('Fetching events with params:', queryParams.toString())

          const eventsResponse = await fetch(
            `https://api-staging.us.nylas.com/v3/grants/${grantId}/events?${queryParams}`, 
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
          const events = response.data || []
          allEvents = allEvents.concat(events)
          pageToken = response.next_page_token
          totalEventsFetched += events.length
          hasMorePages = !!pageToken && events.length > 0
          
          console.log(`Fetched ${events.length} events, total: ${totalEventsFetched}, next page token:`, pageToken)
          
          if (hasMorePages) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        console.log(`Total events fetched for user ${userId}:`, allEvents.length)

        for (const event of allEvents) {
          try {
            await processEvent(event, userId, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
          } catch (error) {
            console.error('Error processing event:', {
              eventId: event.id,
              title: event.title,
              error: error.message,
              stack: error.stack
            })
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