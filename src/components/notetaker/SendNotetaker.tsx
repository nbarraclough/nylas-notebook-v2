import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";

export function SendNotetaker() {
  const [meetingInfo, setMeetingInfo] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Extract meeting URL from meeting info
  const extractMeetingUrl = (info: string) => {
    // Regular expressions for common meeting URL patterns
    const patterns = [
      /https:\/\/[^\s]*(zoom\.us\/j\/[^\s]*)/i,
      /https:\/\/[^\s]*(teams\.microsoft\.com\/l\/meetup-join\/[^\s]*)/i,
      /https:\/\/[^\s]*(meet\.google\.com\/[^\s]*)/i,
    ];

    for (const pattern of patterns) {
      const match = info.match(pattern);
      if (match && match[0]) {
        return match[0];
      }
    }

    // If no patterns match, return the raw input if it looks like a URL
    if (info.startsWith('http') && info.includes('://')) {
      return info.split(/\s+/)[0];
    }

    return null;
  };

  const startRecordingMutation = useMutation({
    mutationFn: async (meetingInfo: string) => {
      const meetingUrl = extractMeetingUrl(meetingInfo);
      if (!meetingUrl) {
        throw new Error('No valid meeting URL found');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // Get user's profile for Nylas grant ID and email
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

      // Calculate start and end time
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Create manual meeting record
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

      // Create event record for the manual meeting
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
          organizer: { email: profile.email, name: profile.email.split('@')[0] }
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Send notetaker to the meeting
      const response = await fetch('/api/send-notetaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingUrl,
          grantId: profile.nylas_grant_id,
          meetingId: meeting.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send notetaker');
      }

      const responseData = await response.json();

      // Create recording entry
      const { error: recordingError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          event_id: event.id,
          notetaker_id: responseData.notetaker_id,
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
      setMeetingInfo("");
      setIsOpen(false);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClear = () => {
    setMeetingInfo("");
  };

  const handleSend = () => {
    if (!meetingInfo.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting URL or joining information",
        variant: "destructive",
      });
      return;
    }

    startRecordingMutation.mutate(meetingInfo);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="gap-2 !bg-[#0F172A] !text-white hover:!bg-[#0F172A]/90"
        >
          <Send className="h-4 w-4" />
          Send Notetaker
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Send Notetaker to Meeting</h4>
          <Textarea
            placeholder="Paste meeting URL or joining information"
            value={meetingInfo}
            onChange={(e) => setMeetingInfo(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={startRecordingMutation.isPending}
            >
              Clear
            </Button>
            <Button
              onClick={handleSend}
              disabled={!meetingInfo.trim() || startRecordingMutation.isPending}
            >
              {startRecordingMutation.isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}