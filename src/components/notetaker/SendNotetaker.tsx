import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InteractiveHoverButton } from "../ui/interactive-hover-button";

export function SendNotetaker() {
  const [meetingInfo, setMeetingInfo] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

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

      // Get user's profile for Nylas grant ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nylas_grant_id')
        .single();

      if (profileError) throw profileError;
      if (!profile.nylas_grant_id) {
        throw new Error('Nylas connection not found. Please connect your calendar first.');
      }

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
        throw new Error('Failed to send notetaker');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notetaker has been sent to the meeting",
      });
      setMeetingInfo("");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
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
        <InteractiveHoverButton 
          text="Send Notetaker"
          className="w-40"
        />
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
