import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isNylasAuthenticated, setIsNylasAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has Nylas connected
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nylas_grant_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to check Nylas connection status.",
          variant: "destructive",
        });
        return;
      }

      setIsNylasAuthenticated(!!profile?.nylas_grant_id);
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
  }, [navigate, toast]);

  // Handle Nylas auth code
  useEffect(() => {
    const handleNylasCode = async () => {
      const code = searchParams.get('code');
      if (!code) return;

      try {
        setIsLoading(true);
        console.log('Exchanging Nylas code for grant_id...');
        
        const { error } = await supabase.functions.invoke('exchange-nylas-token', {
          body: { code }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Calendar connected successfully!",
        });

        // Remove code from URL
        window.history.replaceState({}, '', '/calendar');
        
        // Refresh page to update UI
        window.location.reload();

      } catch (error) {
        console.error('Error exchanging Nylas code:', error);
        toast({
          title: "Error",
          description: "Failed to connect calendar. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleNylasCode();
  }, [searchParams, toast]);

  const handleNylasConnect = async () => {
    try {
      setIsLoading(true);
      
      // Get the current user's email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call Supabase Edge Function to get Nylas auth URL
      const { data, error } = await supabase.functions.invoke('get-nylas-auth-url', {
        body: { email: user.email }
      });

      if (error) {
        console.error('Error getting Nylas auth URL:', error);
        throw error;
      }
      
      // Open Nylas auth URL in a new window
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Error connecting to Nylas:', error);
      toast({
        title: "Error",
        description: "Failed to connect to Nylas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isNylasAuthenticated) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>Connect Your Calendar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Connect your calendar to start recording meetings with Notebook.
              </p>
              <Button 
                size="lg" 
                onClick={handleNylasConnect}
                disabled={isLoading}
              >
                {isLoading ? "Connecting..." : "Connect with Nylas"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Your Calendar</h1>
        <div className="grid gap-4">
          {/* Calendar events will go here */}
        </div>
      </div>
    </PageLayout>
  );
}