import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SharingRules = ({
  userId,
  shareExternal,
  shareInternal,
  onRulesChange
}: {
  userId: string;
  shareExternal: boolean;
  shareInternal: boolean;
  onRulesChange: (updates: { 
    share_external_recordings?: boolean;
    share_internal_recordings?: boolean;
  }) => void;
}) => {
  const { toast } = useToast();

  const updateProfile = useMutation({
    mutationFn: async (updates: {
      share_external_recordings?: boolean;
      share_internal_recordings?: boolean;
    }) => {
      if (!userId) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();

      if (error) throw error;
      return data;
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

  const handleShareInternalChange = () => {
    const newValue = !shareInternal;
    updateProfile.mutate({ share_internal_recordings: newValue });
  };

  const handleShareExternalChange = () => {
    const newValue = !shareExternal;
    updateProfile.mutate({ share_external_recordings: newValue });
  };

  return (
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
  );
};