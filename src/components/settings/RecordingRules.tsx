import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export const RecordingRules = ({
  userId,
  onRulesChange
}: {
  userId: string;
  onRulesChange: (updates: { 
    record_external_meetings?: boolean; 
    record_internal_meetings?: boolean;
    share_external_recordings?: boolean;
    share_internal_recordings?: boolean;
  }) => void;
}) => {
  const { toast } = useToast();
  const [localState, setLocalState] = useState({
    record_external_meetings: false,
    record_internal_meetings: false,
    share_external_recordings: false,
    share_internal_recordings: false
  });

  // Fetch user's current recording preferences
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('record_external_meetings, record_internal_meetings, share_external_recordings, share_internal_recordings')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Update local state when data is fetched
      setLocalState({
        record_external_meetings: data.record_external_meetings || false,
        record_internal_meetings: data.record_internal_meetings || false,
        share_external_recordings: data.share_external_recordings || false,
        share_internal_recordings: data.share_internal_recordings || false
      });
      
      return data;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: {
      record_external_meetings?: boolean;
      record_internal_meetings?: boolean;
      share_external_recordings?: boolean;
      share_internal_recordings?: boolean;
    }) => {
      if (!userId) throw new Error('No user ID');
      
      console.log('Updating profile with:', updates);
      
      const { data, error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      console.log('Profile updated successfully:', data);

      // Call our new edge function to handle recording rules change
      if ('record_external_meetings' in updates || 'record_internal_meetings' in updates) {
        console.log('Recording rules changed, calling handle-recording-rules-change function');
        const { error: handleError } = await supabase.functions.invoke('handle-recording-rules-change', {
          body: { 
            userId, 
            recordExternalMeetings: updates.record_external_meetings !== undefined ? 
              updates.record_external_meetings : localState.record_external_meetings,
            recordInternalMeetings: updates.record_internal_meetings !== undefined ? 
              updates.record_internal_meetings : localState.record_internal_meetings
          }
        });

        if (handleError) throw handleError;
      }

      return data;
    },
    onMutate: (variables) => {
      // Optimistically update local state
      setLocalState(prev => ({ ...prev, ...variables }));
    },
    onError: (error, variables) => {
      console.error('Error updating profile:', error);
      // Revert local state on error
      if (profile) {
        setLocalState({
          record_external_meetings: profile.record_external_meetings || false,
          record_internal_meetings: profile.record_internal_meetings || false,
          share_external_recordings: profile.share_external_recordings || false,
          share_internal_recordings: profile.share_internal_recordings || false
        });
      }
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (_, variables) => {
      onRulesChange(variables);
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });
    }
  });

  const handleRecordExternalChange = () => {
    const newValue = !localState.record_external_meetings;
    updateProfile.mutate({ record_external_meetings: newValue });
  };

  const handleRecordInternalChange = () => {
    const newValue = !localState.record_internal_meetings;
    updateProfile.mutate({ record_internal_meetings: newValue });
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recording Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-6 w-[42px]" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-6 w-[42px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Recording Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Record External Meetings</Label>
            <p className="text-sm text-muted-foreground">
              Record meetings where the host's email domain differs from participants
            </p>
          </div>
          <Switch 
            checked={localState.record_external_meetings}
            onCheckedChange={handleRecordExternalChange}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Record Internal Meetings</Label>
            <p className="text-sm text-muted-foreground">
              Record meetings where all participants share the same email domain
            </p>
          </div>
          <Switch 
            checked={localState.record_internal_meetings}
            onCheckedChange={handleRecordInternalChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};
