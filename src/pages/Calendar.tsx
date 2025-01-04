import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ConnectNylas } from "@/components/calendar/ConnectNylas";
import { EventsList } from "@/components/calendar/EventsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeUpdates } from "@/hooks/use-realtime-updates";

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

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
    enabled: !!userId,
  });

  // Set up realtime listeners
  useRealtimeUpdates(userId);

  // Fetch user profile to check Nylas connection
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('nylas_grant_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to check Nylas connection status.",
          variant: "destructive",
        });
        return null;
      }

      return data;
    },
    enabled: !!userId,
  });

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

  // Handle Nylas auth code
  useEffect(() => {
    const handleNylasCode = async () => {
      const code = searchParams.get('code');
      if (!code || !userId) return;

      try {
        setIsLoading(true);
        console.log('Exchanging Nylas code for grant_id...');
        
        const { error } = await supabase.functions.invoke('exchange-nylas-token', {
          body: { code }
        });

        if (error) throw error;

        // After successful token exchange, trigger events sync
        console.log('Syncing events after Nylas authentication...');
        const { error: syncError } = await supabase.functions.invoke('sync-nylas-events', {
          body: { user_id: userId }
        });

        if (syncError) {
          console.error('Error syncing events:', syncError);
          toast({
            title: "Warning",
            description: "Calendar connected, but failed to sync events. Please try syncing manually.",
            variant: "destructive",
          });
        } else {
          await refetchEvents();
          toast({
            title: "Success",
            description: "Calendar connected and events synced successfully!",
          });
        }

        // Remove code from URL
        window.history.replaceState({}, '', '/calendar');
        
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
  }, [searchParams, toast, userId, refetchEvents]);

  // Show loading state while checking profile
  if (isLoadingProfile) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-pulse">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {!profile?.nylas_grant_id ? (
        <ConnectNylas />
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upcoming" | "past")}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Your Calendar</h1>
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="upcoming">
              <EventsList 
                events={events || []} 
                isLoadingEvents={isLoadingEvents}
                userId={userId || ''}
                refetchEvents={refetchEvents}
                filter="upcoming"
              />
            </TabsContent>
            <TabsContent value="past">
              <EventsList 
                events={events || []} 
                isLoadingEvents={isLoadingEvents}
                userId={userId || ''}
                refetchEvents={refetchEvents}
                filter="past"
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </PageLayout>
  );
}
