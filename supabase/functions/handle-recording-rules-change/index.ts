
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
    const { userId, recordExternalMeetings, recordInternalMeetings } = await req.json()
    console.log('🚀 Starting handle-recording-rules-change process for user:', userId)
    console.log('📊 Recording settings:', { recordExternalMeetings, recordInternalMeetings })

    if (!userId) {
      throw new Error('userId is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Function to determine if an event is an internal meeting
    const isInternalMeeting = (organizer: any, participants: any[]) => {
      if (!organizer?.email || !participants?.length) return true

      const organizerDomain = organizer.email.split('@')[1] || ''
      if (!organizerDomain) return true

      for (const participant of participants) {
        const participantEmail = participant.email || ''
        const participantDomain = participantEmail.split('@')[1] || ''
        
        if (participantDomain && participantDomain !== organizerDomain) {
          return false
        }
      }
      return true
    }

    // Function to check if an event should be recorded based on rules
    const shouldRecordEvent = (event: any) => {
      const internal = isInternalMeeting(event.organizer, event.participants || [])
      return internal ? recordInternalMeetings : recordExternalMeetings
    }

    // Get the user's profile to check if they have a Nylas grant ID
    console.log('🔍 Fetching user profile')
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      throw new Error('Failed to fetch profile')
    }

    if (!profile.nylas_grant_id) {
      console.error('❌ No Nylas grant ID found for user:', userId)
      throw new Error('No Nylas grant ID found for user')
    }

    // If both recording settings are turned off, cancel all active notetakers
    if (!recordExternalMeetings && !recordInternalMeetings) {
      console.log('🔴 Both recording settings are turned off, cancelling all active recordings')
      
      // Get all active recordings with notetaker_id
      const { data: activeRecordings, error: recordingsError } = await supabaseClient
        .from('recordings')
        .select('id, notetaker_id')
        .eq('user_id', userId)
        .in('status', ['waiting', 'joining', 'recording'])
        .not('notetaker_id', 'is', null)

      if (recordingsError) {
        console.error('❌ Error fetching active recordings:', recordingsError)
        throw new Error('Failed to fetch active recordings')
      }

      console.log(`📋 Found ${activeRecordings?.length || 0} active recordings to cancel`)

      // Cancel each notetaker
      for (const recording of activeRecordings || []) {
        if (!recording.notetaker_id) continue

        try {
          console.log(`🚫 Cancelling notetaker ${recording.notetaker_id} for recording ${recording.id}`)
          
          // Call the Nylas API to cancel the notetaker
          const response = await fetch(
            `https://api.us.nylas.com/v3/grants/${profile.nylas_grant_id}/notetakers/${recording.notetaker_id}/cancel`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
                'Accept': 'application/json, application/gzip'
              }
            }
          )

          // Log the response for debugging
          const responseText = await response.text()
          console.log(`📥 Nylas API Response for ${recording.notetaker_id}:`, response.status, responseText)

          // Update recording status to cancelled
          await supabaseClient
            .from('recordings')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', recording.id)

          console.log(`✅ Recording ${recording.id} marked as cancelled`)
        } catch (err) {
          // Log the error but continue with other recordings
          console.error(`❌ Error cancelling notetaker ${recording.notetaker_id}:`, err)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cancelled ${activeRecordings?.length || 0} recordings`,
          cancelledCount: activeRecordings?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // If we get here, at least one recording rule is enabled
    console.log('🟢 Recording rules are enabled, checking for eligible events')

    // Get all future events with conference URLs
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    const { data: eligibleEvents, error: eventsError } = await supabaseClient
      .from('events')
      .select('id, title, start_time, organizer, participants, conference_url')
      .eq('user_id', userId)
      .not('conference_url', 'is', null)
      .lt('start_time', tomorrow.toISOString())
      .gt('start_time', new Date().toISOString())

    if (eventsError) {
      console.error('❌ Error fetching eligible events:', eventsError)
      throw new Error('Failed to fetch eligible events')
    }

    console.log(`📋 Found ${eligibleEvents?.length || 0} future events to evaluate`)

    // Filter events that should be recorded based on rules
    const eventsToRecord = eligibleEvents?.filter(event => event.conference_url && shouldRecordEvent(event)) || []
    console.log(`🎯 ${eventsToRecord.length} events match recording rules`)

    // Count of newly scheduled events
    let scheduledCount = 0

    // For each eligible event, check if it already has a recording and create one if not
    for (const event of eventsToRecord) {
      try {
        // Check if a recording already exists
        const { data: existingRecording, error: recordingError } = await supabaseClient
          .from('recordings')
          .select('id, status, notetaker_id')
          .eq('event_id', event.id)
          .eq('user_id', userId)
          .maybeSingle()

        if (recordingError) {
          console.error(`❌ Error checking existing recording for event ${event.id}:`, recordingError)
          continue
        }

        // If recording exists and is active, skip
        if (existingRecording && ['waiting', 'joining', 'recording'].includes(existingRecording.status)) {
          console.log(`⏭️ Event ${event.id} already has an active recording`)
          continue
        }

        // Calculate join time (epoch seconds) for the meeting start time
        const startDate = new Date(event.start_time)
        const joinTime = Math.floor(startDate.getTime() / 1000)

        console.log(`🔄 Creating notetaker for event ${event.id} with join time ${joinTime}`)

        // Call the Nylas API to create a new notetaker
        const response = await fetch(
          `https://api.us.nylas.com/v3/grants/${profile.nylas_grant_id}/notetakers`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
              'Accept': 'application/json, application/gzip',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              meeting_link: event.conference_url,
              join_time: joinTime,
              meeting_settings: {
                video_recording: true,
                audio_recording: true,
                transcription: true
              }
            })
          }
        )

        const responseText = await response.text()
        const responseData = JSON.parse(responseText)
        console.log(`📥 Nylas API Response for event ${event.id}:`, response.status, responseText)

        if (!response.ok || !responseData.data?.id) {
          console.error(`❌ Failed to create notetaker for event ${event.id}`)
          continue
        }

        const notetakerId = responseData.data.id

        // Create or update recording entry
        if (existingRecording) {
          await supabaseClient
            .from('recordings')
            .update({
              notetaker_id: notetakerId,
              status: 'waiting',
              join_time: new Date(joinTime * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              meeting_settings: {
                video_recording: true,
                audio_recording: true,
                transcription: true
              }
            })
            .eq('id', existingRecording.id)
        } else {
          await supabaseClient
            .from('recordings')
            .insert({
              user_id: userId,
              event_id: event.id,
              notetaker_id: notetakerId,
              status: 'waiting',
              join_time: new Date(joinTime * 1000).toISOString(),
              meeting_settings: {
                video_recording: true,
                audio_recording: true,
                transcription: true
              }
            })
        }

        scheduledCount++
        console.log(`✅ Successfully scheduled recording for event ${event.id}`)
      } catch (err) {
        console.error(`❌ Error processing event ${event.id}:`, err)
      }
    }

    console.log(`🏁 Finished processing recording rules change. Scheduled ${scheduledCount} new recordings.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed recording rules change. Scheduled ${scheduledCount} new recordings.`,
        scheduledCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Error in handle-recording-rules-change:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process recording rules change' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
