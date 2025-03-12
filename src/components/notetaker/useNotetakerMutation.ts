
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Extract meeting URL from meeting info
const extractMeetingUrl = (info: string) => {
  console.log('Original meeting info:', info);
  
  // Handle all Zoom variations with any subdomain
  const zoomPattern = /(?:https:\/\/)?([a-z0-9-]+\.)?zoom\.us\/j\/[\d]+(?:[?\/][^"\s<>]*)?/i;
  const zoomGovPattern = /(?:https:\/\/)?([a-z0-9-]+\.)?zoomgov\.com\/j\/[\d]+(?:[?\/][^"\s<>]*)?/i;
  
  // Match against Zoom patterns first
  const zoomMatch = info.match(zoomPattern) || info.match(zoomGovPattern);
  if (zoomMatch) {
    // Return the full matched URL to preserve all parameters
    const extractedUrl = zoomMatch[0].startsWith('http') ? zoomMatch[0] : `https://${zoomMatch[0]}`;
    console.log('Extracted Zoom URL:', extractedUrl);
    return extractedUrl;
  }

  // Handle Microsoft Teams URLs with improved pattern
  // This pattern handles the complex structure of Teams URLs including the thread ID and context parameters
  const teamsPattern = /(?:https:\/\/)?teams\.microsoft\.com\/l\/meetup-join\/[^/]+\/[^?]+(?:\?context=(?:[^&\s"<>]+))?/i;
  const teamsMatch = info.match(teamsPattern);
  if (teamsMatch) {
    const extractedUrl = teamsMatch[0].startsWith('http') ? teamsMatch[0] : `https://${teamsMatch[0]}`;
    console.log('Extracted Teams URL:', extractedUrl);
    return extractedUrl;
  }

  // Handle Google Meet URLs
  const googleMeetPattern = /https:\/\/meet\.google\.com\/[\w-]+/;
  const googleMeetMatch = info.match(googleMeetPattern);
  if (googleMeetMatch) {
    console.log('Extracted Google Meet URL:', googleMeetMatch[0]);
    return googleMeetMatch[0];
  }

  // Handle other platform patterns
  const patterns = [
    // Removed the old Teams pattern as we have a better one above
    /(?:https:\/\/)?[^\s]*(meet\.google\.com\/[^\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = info.match(pattern);
    if (match && match[1]) {
      const extractedUrl = `https://${match[1]}`;
      console.log('Extracted platform URL:', extractedUrl);
      return extractedUrl;
    }
  }

  // Handle generic URLs
  if (info.match(/^(?:https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/i)) {
    const cleanUrl = info.trim().replace(/\s+/g, '');
    const extractedUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
    console.log('Extracted generic URL:', extractedUrl);
    return extractedUrl;
  }

  console.log('No valid meeting URL found in:', info);
  return null;
};

// Validate if a URL is a valid meeting URL
const validateMeetingUrl = (url: string | null): boolean => {
  if (!url) return false;
  
  const zoomPattern = /(?:https:\/\/)?([a-z0-9-]+\.)?zoom\.us\/j\/[\d]+(?:[?\/][^"\s<>]*)?/i;
  const zoomGovPattern = /(?:https:\/\/)?([a-z0-9-]+\.)?zoomgov\.com\/j\/[\d]+(?:[?\/][^"\s<>]*)?/i;
  const googleMeetPattern = /https:\/\/meet\.google\.com\/[\w-]+/;
  // Updated Teams pattern for validation
  const teamsPattern = /(?:https:\/\/)?teams\.microsoft\.com\/l\/meetup-join\/[^/]+\/[^?]+(?:\?context=(?:[^&\s"<>]+))?/i;
  
  const isValid = zoomPattern.test(url) || 
                  zoomGovPattern.test(url) || 
                  googleMeetPattern.test(url) || 
                  teamsPattern.test(url);
  
  console.log(`URL validation result for ${url}: ${isValid}`);
  return isValid;
};

export function useNotetakerMutation(onSuccess: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingInfo: string) => {
      console.log('Starting notetaker request...');
      
      const meetingUrl = extractMeetingUrl(meetingInfo);
      if (!meetingUrl) {
        throw new Error('No valid meeting URL found in the provided information');
      }
      
      if (!validateMeetingUrl(meetingUrl)) {
        console.warn('URL passed validation but may not be a recognized meeting platform:', meetingUrl);
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // Query for user's profile including notetaker_name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nylas_grant_id, email, notetaker_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Profile not found');
      if (!profile.nylas_grant_id) {
        throw new Error('Nylas connection not found. Please connect your calendar first.');
      }

      console.log('Retrieved profile with notetaker_name:', profile.notetaker_name);

      const startTime = new Date();
      // Calculate join time (epoch seconds) for now
      const joinTime = Math.floor(startTime.getTime() / 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      console.log('Creating manual meeting record with URL:', meetingUrl);
      const { data: meeting, error: meetingError } = await supabase
        .from('manual_meetings')
        .insert({
          title: 'Manual Meeting',
          meeting_url: meetingUrl,
          user_id: user.id
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      console.log('Creating event record...');
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: 'Manual Meeting',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          conference_url: meetingUrl,
          nylas_event_id: `manual-${meeting.id}`,
          participants: [{ email: profile.email, name: profile.email.split('@')[0] }],
          organizer: { email: profile.email, name: profile.email.split('@')[0] },
          manual_meeting_id: meeting.id
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Use the create-notetaker function with the current time as join time
      console.log('Sending notetaker to meeting with URL:', meetingUrl);
      const { data, error } = await supabase.functions.invoke('create-notetaker', {
        body: {
          event_id: event.id,
          join_time: joinTime,
          meeting_settings: {
            video_recording: true,
            audio_recording: true,
            transcription: true
          }
        }
      });

      if (error) {
        console.error('Failed to send notetaker');
        throw error;
      }

      if (!data?.notetaker_id) {
        console.error('Invalid response from server');
        throw new Error('Invalid response from server');
      }

      console.log('Notetaker sent successfully');
      return { success: true, notetakerId: data.notetaker_id };
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Notetaker has been sent to the meeting",
      });
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess();
    },
    onError: (error: Error) => {
      console.error('Error sending notetaker:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
