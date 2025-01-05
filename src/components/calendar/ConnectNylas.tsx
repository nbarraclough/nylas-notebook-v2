import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ConnectNylas = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState<'idle' | 'exchanging' | 'syncing'>('idle');
  const [grantStatus, setGrantStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkGrantStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('grant_status, nylas_grant_id')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setGrantStatus(profile.grant_status);
      }
    };

    checkGrantStatus();
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleNylasCode(code);
    }
  }, [searchParams]);

  const handleNylasCode = async (code: string) => {
    try {
      setIsLoading(true);
      setAuthStep('exchanging');
      
      const { data, error } = await supabase.functions.invoke('exchange-nylas-token', {
        body: { code }
      });

      if (error) throw error;
      if (!data?.grant_id) throw new Error('No grant ID returned');

      setAuthStep('syncing');
      
      // Remove code from URL without triggering a page reload
      window.history.replaceState({}, '', '/calendar');

      // Sync events after successful connection
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not found');

      const { error: syncError } = await supabase.functions.invoke('sync-nylas-events', {
        body: { user_id: userId }
      });

      if (syncError) throw syncError;

      toast({
        title: "Success",
        description: "Calendar connected and events synced successfully!",
      });

      // Force a page reload to show the new events
      window.location.reload();

    } catch (error) {
      console.error('Error during Nylas authentication:', error);
      toast({
        title: "Error",
        description: "Failed to connect calendar. Please try again.",
        variant: "destructive",
      });
      // Reset loading state on error
      setIsLoading(false);
      setAuthStep('idle');
    }
  };

  const handleNylasConnect = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.email) {
        throw new Error('User email not found');
      }

      const { data, error } = await supabase.functions.invoke('get-nylas-auth-url', {
        body: { email: session.user.email }
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('No auth URL returned');

      // Redirect to Nylas auth page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error getting Nylas auth URL:', error);
      toast({
        title: "Error",
        description: "Failed to start Nylas authentication. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const renderLoadingState = () => {
    let message = "Connecting to Nylas...";
    if (authStep === 'exchanging') {
      message = "Authenticating with Nylas...";
    } else if (authStep === 'syncing') {
      message = "Syncing your calendar events...";
    }

    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  };

  const renderGrantStatusAlert = () => {
    if (!grantStatus || grantStatus === 'active') return null;

    let message = "";
    switch (grantStatus) {
      case 'pending':
        message = "Your calendar connection is pending. Please authenticate to continue.";
        break;
      case 'expired':
        message = "Your calendar connection has expired. Please reconnect to continue.";
        break;
      case 'error':
        message = "There was an error with your calendar connection. Please reconnect to continue.";
        break;
      case 'revoked':
        message = "Your calendar access has been revoked. Please reconnect to continue.";
        break;
      default:
        message = "Please authenticate your calendar to continue.";
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Connect Your Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderGrantStatusAlert()}
          {isLoading ? (
            renderLoadingState()
          ) : (
            <>
              <p className="text-muted-foreground">
                Connect your calendar to start recording meetings with Notebook.
              </p>
              <Button 
                size="lg" 
                onClick={handleNylasConnect}
                disabled={isLoading}
              >
                Connect with Nylas
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};