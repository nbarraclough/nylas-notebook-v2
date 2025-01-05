import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const RecordingRules = ({
  userId,
  recordExternal,
  recordInternal,
  shareExternal,
  shareInternal,
  onRulesChange
}: {
  userId: string;
  recordExternal: boolean;
  recordInternal: boolean;
  shareExternal: boolean;
  shareInternal: boolean;
  onRulesChange: (updates: { 
    record_external_meetings?: boolean; 
    record_internal_meetings?: boolean;
    share_external_recordings?: boolean;
    share_internal_recordings?: boolean;
  }) => void;
}) => {
  const { toast } = useToast();

  const updateProfile = useMutation({
    mutationFn: async (updates: {
      record_external_meetings?: boolean;
      record_internal_meetings?: boolean;
      share_external_recordings?: boolean;
      share_internal_recordings?: boolean;
    }) => {
      if (!userId) throw new Error('No user ID');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (profileError) throw profileError;

      console.log('Recording rules changed, triggering event re-evaluation');
      const { error: evalError } = await supabase.functions.invoke('sync-nylas-events', {
        body: { 
          user_id: userId,
          force_recording_rules: true 
        }
      });

      if (evalError) throw evalError;
    },
    onSuccess: (_, variables) => {
      onRulesChange(variables);
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRecordExternalChange = () => {
    const newValue = !recordExternal;
    updateProfile.mutate({ record_external_meetings: newValue });
  };

  const handleRecordInternalChange = () => {
    const newValue = !recordInternal;
    updateProfile.mutate({ record_internal_meetings: newValue });
  };

  const handleShareExternalChange = () => {
    const newValue = !shareExternal;
    updateProfile.mutate({ share_external_recordings: newValue });
  };

  const handleShareInternalChange = () => {
    const newValue = !shareInternal;
    updateProfile.mutate({ share_internal_recordings: newValue });
  };

  return (
    <>
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
              checked={recordExternal}
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
              checked={recordInternal}
              onCheckedChange={handleRecordInternalChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization Sharing Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatically Share Internal Meeting Recordings</Label>
              <p className="text-sm text-muted-foreground">
                Share recordings of internal meetings with your organization
              </p>
            </div>
            <Switch 
              checked={shareInternal}
              onCheckedChange={handleShareInternalChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatically Share External Meeting Recordings</Label>
              <p className="text-sm text-muted-foreground">
                Share recordings of external meetings with your organization
              </p>
            </div>
            <Switch 
              checked={shareExternal}
              onCheckedChange={handleShareExternalChange}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};