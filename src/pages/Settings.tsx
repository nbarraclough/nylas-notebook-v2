import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [notetakerName, setNotetakerName] = useState("");
  const [recordExternal, setRecordExternal] = useState(false);
  const [recordInternal, setRecordInternal] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Update notetaker name
  const updateNotetakerName = useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update({ notetaker_name: name })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notetaker name updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating notetaker name:', error);
      toast({
        title: "Error",
        description: "Failed to update notetaker name. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update recording rules
  const updateProfile = useMutation({
    mutationFn: async (updates: {
      record_external_meetings?: boolean;
      record_internal_meetings?: boolean;
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
    onSuccess: () => {
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

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Update local state when profile data is loaded
  useEffect(() => {
    if (profile) {
      setNotetakerName(profile.notetaker_name || "");
      setRecordExternal(profile.record_external_meetings || false);
      setRecordInternal(profile.record_internal_meetings || false);
    }
  }, [profile]);

  const handleSaveNotetakerName = () => {
    updateNotetakerName.mutate(notetakerName);
  };

  const handleRecordExternalChange = () => {
    const newValue = !recordExternal;
    setRecordExternal(newValue);
    updateProfile.mutate({ record_external_meetings: newValue });
  };

  const handleRecordInternalChange = () => {
    const newValue = !recordInternal;
    setRecordInternal(newValue);
    updateProfile.mutate({ record_internal_meetings: newValue });
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Notetaker Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="notetaker-name">Notetaker Name</Label>
                <Input 
                  id="notetaker-name" 
                  placeholder="Enter name for your Notetaker" 
                  value={notetakerName}
                  onChange={(e) => setNotetakerName(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSaveNotetakerName}
                disabled={updateNotetakerName.isPending}
              >
                Save Name
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
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
      </div>
    </PageLayout>
  );
}