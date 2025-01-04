import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

export const ConnectNylas = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleNylasCode(code);
    }
  }, [searchParams]);

  const handleNylasCode = async (code: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('exchange-nylas-token', {
        body: { code }
      });

      if (error) throw error;
      if (!data?.grant_id) throw new Error('No grant ID returned');

      toast({
        title: "Success",
        description: "Calendar connected successfully!",
      });

      // Remove code from URL
      navigate('/calendar', { replace: true });

      // Sync events after successful connection
      await supabase.functions.invoke('sync-nylas-events', {
        body: { user_id: (await supabase.auth.getUser()).data.user?.id }
      });

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};