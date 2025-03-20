
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sharing Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Configure your sharing settings in individual recordings by using the share button.
        </p>
      </CardContent>
    </Card>
  );
};
