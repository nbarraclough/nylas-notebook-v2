import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Extract meeting URL from meeting info
const extractMeetingUrl = (info: string) => {
  const googleMeetPattern = /https:\/\/meet\.google\.com\/[\w-]+/;
  const googleMeetMatch = info.match(googleMeetPattern);
  if (googleMeetMatch) {
    return googleMeetMatch[0];
  }

  const patterns = [
    /(?:https:\/\/)?[^\s]*(zoom\.us\/j\/[^\s]*)/i,
    /(?:https:\/\/)?[^\s]*(teams\.microsoft\.com\/l\/meetup-join\/[^\s]*)/i,
    /(?:https:\/\/)?[^\s]*(meet\.google\.com\/[^\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = info.match(pattern);
    if (match && match[1]) {
      return `https://${match[1]}`;
    }
  }

  if (info.match(/^(?:https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/i)) {
    const cleanUrl = info.trim().replace(/\s+/g, '');
    return cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
  }

  return null;
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

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nylas_grant_id, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Profile not found');
      if (!profile.nylas_grant_id) {
        throw new Error('Nylas connection not found. Please connect your calendar first.');
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      console.log('Creating manual meeting record...');
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

      console.log('Sending notetaker to meeting...');
      const { data, error } = await supabase.functions.invoke('send-notetaker', {
        body: {
          meetingUrl,
          grantId: profile.nylas_grant_id,
          meetingId: event.id,
        }
      });

      if (error) {
        console.error('Failed to send notetaker');
        throw new Error('Failed to send notetaker');
      }

      if (!data?.notetaker_id) {
        console.error('Invalid response from server');
        throw new Error('Invalid response from server');
      }

      console.log('Notetaker sent successfully');

      const { error: recordingError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          event_id: event.id,
          notetaker_id: data.notetaker_id,
          recording_url: '',
          status: 'pending'
        });

      if (recordingError) throw recordingError;

      return { success: true };
    },
    onSuccess: () => {
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
