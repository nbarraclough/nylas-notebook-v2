import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";
import { useAuth } from "@supabase/auth-helpers-react";

export default function Manual() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [meetingInfo, setMeetingInfo] = useState("");
  const queryClient = useQueryClient();
  const auth = useAuth();

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
    mutationFn: async ({ meetingUrl, title }: { meetingUrl: string, title: string }) => {
      if (!auth?.user?.id) {
        throw new Error('User not authenticated');
      }

      // First, create the manual meeting record
      const { data: meeting, error: meetingError } = await supabase
        .from('manual_meetings')
        .insert({
          title,
          meeting_url: meetingUrl,
          user_id: auth.user.id
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Get the user's Nylas grant ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nylas_grant_id')
        .single();

      if (profileError) throw profileError;
      if (!profile.nylas_grant_id) throw new Error('Nylas grant ID not found');

      // Send the notetaker to the meeting
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
      setTitle("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const meetingUrl = extractMeetingUrl(meetingInfo);
    if (!meetingUrl) {
      toast({
        title: "Error",
        description: "No valid meeting URL found in the provided information",
        variant: "destructive",
      });
      return;
    }

    startRecordingMutation.mutate({
      meetingUrl,
      title: title || "Manual Meeting",
    });
  };

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Manual Recording</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Start a Manual Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Meeting Title
                </label>
                <Input
                  id="title"
                  placeholder="Enter meeting title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="meetingInfo" className="text-sm font-medium">
                  Meeting URL or Joining Information
                </label>
                <Textarea
                  id="meetingInfo"
                  placeholder="Paste the meeting URL or the full joining information"
                  value={meetingInfo}
                  onChange={(e) => setMeetingInfo(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                type="submit" 
                disabled={!meetingInfo.trim() || startRecordingMutation.isPending}
                className="w-full"
              >
                {startRecordingMutation.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Sending Notetaker...
                  </>
                ) : (
                  'Start Recording'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}