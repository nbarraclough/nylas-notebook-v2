import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { EventsTable } from "@/components/calendar/EventsTable";
import { SkeletonTable } from "@/components/calendar/SkeletonTable";

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isNylasAuthenticated, setIsNylasAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch events from our database
  const { data: events, refetch: refetchEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId && isNylasAuthenticated,
  });

  // Sync events from Nylas
  const syncEvents = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      console.log('Syncing events...');
      const { error } = await supabase.functions.invoke('sync-nylas-events', {
        body: { user_id: userId }
      });

      if (error) throw error;

      await refetchEvents();
      toast({
        title: "Success",
        description: "Calendar events synced successfully!",
      });
    } catch (error) {
      console.error('Error syncing events:', error);
      toast({
        title: "Error",
        description: "Failed to sync calendar events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

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

      const hasNylas = !!profile?.nylas_grant_id;
      setIsNylasAuthenticated(hasNylas);

      // If authenticated with Nylas and we don't have events yet, sync them
      if (hasNylas && (!events || events.length === 0)) {
        console.log('Initial sync of events...');
        syncEvents();
      }
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
  }, [navigate, toast, events]);

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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Your Calendar</h1>
          <Button 
            onClick={syncEvents} 
            disabled={isLoading}
          >
            {isLoading ? "Syncing..." : "Sync Events"}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {isLoadingEvents ? (
              <SkeletonTable />
            ) : events && events.length > 0 ? (
              <EventsTable events={events} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No events found. Click "Sync Events" to fetch your calendar events.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}