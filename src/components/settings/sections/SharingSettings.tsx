import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SharingRules } from "@/components/settings/SharingRules";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SharingSettingsProps {
  userId: string;
}

export function SharingSettings({ userId }: SharingSettingsProps) {
  const [shareExternal, setShareExternal] = useState(false);
  const [shareInternal, setShareInternal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSharingPreferences = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('share_external_recordings, share_internal_recordings')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching sharing preferences:', error);
        toast({
          title: "Error",
          description: "Failed to load sharing preferences",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setShareExternal(data.share_external_recordings || false);
        setShareInternal(data.share_internal_recordings || false);
      }
    };

    fetchSharingPreferences();
  }, [userId, toast]);

  const handleRulesChange = (updates: {
    share_external_recordings?: boolean;
    share_internal_recordings?: boolean;
  }) => {
    if (updates.share_external_recordings !== undefined) {
      setShareExternal(updates.share_external_recordings);
    }
    if (updates.share_internal_recordings !== undefined) {
      setShareInternal(updates.share_internal_recordings);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sharing Rules</h2>
      <Card>
        <CardHeader>
          <CardTitle>Sharing Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SharingRules 
            userId={userId}
            shareExternal={shareExternal}
            shareInternal={shareInternal}
            onRulesChange={handleRulesChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}