
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { addMonths } from '../sync-nylas-events/timestamp-utils.ts'

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

    // Get the user's profile to check if they have a Nylas grant ID and notetaker name
    console.log('🔍 Fetching user profile')
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('nylas_grant_id, notetaker_name') // Added notetaker_name to the query
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

    // Get the notetaker name from the profile or use default if not set
    const notetakerName = profile.notetaker_name || `Notetaker`
    console.log(`📝 Using notetaker name: "${notetakerName}"`)

    // If both recording settings are turned off, cancel all active notetakers that are in 'waiting' status
    if (!recordExternalMeetings && !recordInternalMeetings) {
      console.log('🔴 Both recording settings are turned off, cancelling all waiting recordings')
      
      // Get all active recordings with notetaker_id that are in 'waiting' status
      const { data: activeRecordings, error: recordingsError } = await supabaseClient
        .from('recordings')
        .select('id, notetaker_id')
        .eq('user_id', userId)
        .eq('status', 'waiting') // Only cancel recordings in 'waiting' status
        .not('notetaker_id', 'is', null)

      if (recordingsError) {
        console.error('❌ Error fetching active recordings:', recordingsError)
        throw new Error('Failed to fetch active recordings')
      }

      console.log(`📋 Found ${activeRecordings?.length || 0} waiting recordings to cancel`)

      // Cancel each notetaker
      for (const recording of activeRecordings || []) {
        if (!recording.notetaker_id) continue

        try {
          console.log(`🚫 [NoteTaker ID: ${recording.notetaker_id}] Cancelling notetaker for recording ${recording.id}`)
          
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
          console.log(`📥 [NoteTaker ID: ${recording.notetaker_id}] Nylas API Response: ${response.status}`, responseText)

          // Update recording status to cancelled
          await supabaseClient
            .from('recordings')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', recording.id)

          console.log(`✅ [NoteTaker ID: ${recording.notetaker_id}] Recording ${recording.id} marked as cancelled`)
        } catch (err) {
          // Log the error but continue with other recordings
          console.error(`❌ [NoteTaker ID: ${recording.notetaker_id}] Error cancelling notetaker:`, err)
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

    // Get all future events with conference URLs for the next 3 months
    const now = new Date();
    const threeMonthsFromNow = addMonths(now, 3);
    console.log(`🔍 Looking for events between now (${now.toISOString()}) and 3 months from now (${threeMonthsFromNow.toISOString()})`)

    const { data: eligibleEvents, error: eventsError } = await supabaseClient
      .from('events')
      .select('id, title, start_time, organizer, participants, conference_url')
      .eq('user_id', userId)
      .not('conference_url', 'is', null)
      .lt('start_time', threeMonthsFromNow.toISOString())
      .gt('start_time', now.toISOString())

    if (eventsError) {
      console.error('❌ Error fetching eligible events:', eventsError)
      throw new Error('Failed to fetch eligible events')
    }

    console.log(`📋 Found ${eligibleEvents?.length || 0} future events to evaluate in the next 3 months`)

    // Filter events that should be recorded based on rules
    const eventsToRecord = eligibleEvents?.filter(event => event.conference_url && shouldRecordEvent(event)) || []
    console.log(`🎯 ${eventsToRecord.length} events match recording rules`)

    // Count of newly scheduled events
    let scheduledCount = 0

    // For each eligible event, check if it already has a recording and create one if not
    for (const event of eventsToRecord) {
      try {
        // FIX: Updated query to handle multiple recordings for the same event
        // Get all recordings for this event, order by created_at DESC to get the most recent first
        const { data: existingRecordings, error: recordingsError } = await supabaseClient
          .from('recordings')
          .select('id, status, notetaker_id, created_at')
          .eq('event_id', event.id)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (recordingsError) {
          console.error(`❌ Error checking existing recordings for event ${event.id}:`, recordingsError)
          console.error(`Full error details:`, JSON.stringify(recordingsError, null, 2))
          continue
        }

        // Find the most recent active recording (if any)
        const activeRecording = existingRecordings?.find(rec => 
          ['waiting', 'joining', 'recording'].includes(rec.status)
        );

        // Calculate join time (epoch seconds) for the meeting start time
        const startDate = new Date(event.start_time)
        const joinTime = Math.floor(startDate.getTime() / 1000)

        // Check if there's an active recording
        if (activeRecording) {
          console.log(`⏭️ Event ${event.id} already has an active recording with notetaker ${activeRecording.notetaker_id}`)
          continue
        }

        // If this event has cancelled recordings but no active ones, we'll create a new one
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
              name: notetakerName, // Updated from notetaker_name to name
              meeting_settings: {
                video_recording: true,
                audio_recording: true,
                transcription: true
              }
            })
          }
        )

        const responseText = await response.text()
        console.log(`📥 Raw Nylas API response: ${responseText}`)
        
        try {
          const responseData = JSON.parse(responseText)
          const notetakerId = responseData.data?.id
          
          if (notetakerId) {
            console.log(`📥 [NoteTaker ID: ${notetakerId}] Successfully created notetaker for event ${event.id}`)
            console.log(`👤 Notetaker name used: "${notetakerName}"`)
            
            // Choose the most recent recording to update, if there are any cancelled ones
            if (existingRecordings && existingRecordings.length > 0) {
              // Get the most recent recording (should be the first one after ordering)
              const recordingToUpdate = existingRecordings[0];
              
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
                .eq('id', recordingToUpdate.id)
                
              console.log(`✅ [NoteTaker ID: ${notetakerId}] Updated existing recording ${recordingToUpdate.id}`)
              
              // Cancel or cleanup any other recordings for this event if there are duplicates
              if (existingRecordings.length > 1) {
                console.log(`🧹 Found ${existingRecordings.length - 1} additional recordings for event ${event.id}, cleaning up...`)
                
                // Skip the first one (most recent) that we just updated
                for (let i = 1; i < existingRecordings.length; i++) {
                  const oldRec = existingRecordings[i];
                  
                  // If this recording has a notetaker_id and is not already cancelled, cancel it with Nylas
                  if (oldRec.notetaker_id && oldRec.status !== 'cancelled') {
                    try {
                      console.log(`🚫 [NoteTaker ID: ${oldRec.notetaker_id}] Cancelling duplicate notetaker for recording ${oldRec.id}`)
                      
                      const cancelResponse = await fetch(
                        `https://api.us.nylas.com/v3/grants/${profile.nylas_grant_id}/notetakers/${oldRec.notetaker_id}/cancel`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${Deno.env.get('NYLAS_CLIENT_SECRET')}`,
                            'Accept': 'application/json, application/gzip'
                          }
                        }
                      )
                      
                      console.log(`📥 Nylas API Cancel Response: ${cancelResponse.status}`)
                    } catch (cancelErr) {
                      console.error(`⚠️ Error cancelling duplicate notetaker ${oldRec.notetaker_id}:`, cancelErr)
                      // Continue with database update even if API call fails
                    }
                  }
                  
                  // Mark old recording as cancelled in database
                  await supabaseClient
                    .from('recordings')
                    .update({
                      status: 'cancelled',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', oldRec.id)
                  
                  console.log(`✅ Marked duplicate recording ${oldRec.id} as cancelled`)
                }
              }
            } else {
              // No existing recordings, create a new one
              const { data: newRecording, error: insertError } = await supabaseClient
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
                .select('id')
                .single()
                
              if (insertError) {
                console.error(`❌ [NoteTaker ID: ${notetakerId}] Error creating new recording:`, insertError)
              } else {
                console.log(`✅ [NoteTaker ID: ${notetakerId}] Created new recording ${newRecording.id}`)
              }
            }

            scheduledCount++
          } else {
            console.error(`❌ Error: No notetaker ID in response for event ${event.id}`, responseData)
          }
        } catch (parseError) {
          console.error(`❌ Error parsing response for event ${event.id}:`, parseError, responseText)
        }
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
