
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type NylasProvider = 'google' | 'microsoft';

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
        
        if (profile.grant_status === 'expired') {
          toast({
            title: "Calendar Connection Expired",
            description: "Your calendar access has expired. Please reconnect to continue using Notebook.",
            variant: "destructive",
          });
        }
      }
    };

    checkGrantStatus();
  }, [toast]);

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
      
      window.history.replaceState({}, '', '/calendar');

      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not found');

      // Updated to pass both user_id and grant_id to the sync-nylas-events function
      console.log(`[NoteTaker] Syncing events for user ${userId} with grant ID ${data.grant_id}`);
      const { error: syncError } = await supabase.functions.invoke('sync-nylas-events', {
        body: { 
          user_id: userId,
          grant_id: data.grant_id 
        }
      });

      if (syncError) {
        console.error(`[NoteTaker] Error syncing events: ${syncError.message}`);
        throw syncError;
      }

      toast({
        title: "Success",
        description: "Calendar connected and events synced successfully!",
      });

      window.location.reload();

    } catch (error) {
      console.error('Error during Nylas authentication:', error);
      toast({
        title: "Error",
        description: "Failed to connect calendar. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      setAuthStep('idle');
    }
  };

  const handleNylasConnect = async (provider: NylasProvider) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.email) {
        throw new Error('User email not found');
      }

      const { data, error } = await supabase.functions.invoke('get-nylas-auth-url', {
        body: { 
          email: session.user.email,
          provider
        }
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('No auth URL returned');

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
    let variant = "destructive";

    switch (grantStatus) {
      case 'pending':
        message = "Your calendar connection is pending. Please authenticate to continue.";
        variant = "default";
        break;
      case 'expired':
        message = "⚠️ Your calendar access has expired. You must reconnect to continue using Notebook.";
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
      <Alert variant={variant as "default" | "destructive"} className="mb-4">
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
                {grantStatus === 'expired' 
                  ? "Your calendar access has expired. Please reconnect to continue using Notebook."
                  : "Connect your calendar to start recording meetings with Notebook."}
              </p>
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => handleNylasConnect('google')}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center"
                >
                  <img 
                    src="/lovable-uploads/5fe3ce98-cc17-401a-987b-a6aa508a8c2a.png" 
                    alt="Sign in with Google"
                    className="h-10"
                  />
                </button>
                <button
                  onClick={() => handleNylasConnect('microsoft')}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center"
                >
                  <img 
                    src="/lovable-uploads/24711847-41d3-4b74-8ff0-0439aa5f47ad.png" 
                    alt="Sign in with Microsoft"
                    className="h-10"
                  />
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
