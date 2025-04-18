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
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [isInitialSync, setIsInitialSync] = useState(false);

  // Add query for grant status
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('grant_status, nylas_grant_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!userId,
  });

  const { data: events, refetch: refetchEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Modified query to only fetch user's own events
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId) // Only fetch events where user_id matches
        .order('start_time', { ascending: true });

      if (error) throw error;

      // If this is the first successful fetch and we have events, show a success toast
      if (data.length > 0 && isInitialSync) {
        toast({
          title: "Calendar Synced",
          description: "Your calendar has been successfully connected and events synced!",
        });
        setIsInitialSync(false);
      }

      return data;
    },
    enabled: !!userId,
  });

  // Set up realtime listeners
  useRealtimeUpdates(userId);

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

  // Check if we just connected Nylas (code param exists)
  useEffect(() => {
    if (searchParams.get('code')) {
      setIsInitialSync(true);
    }
  }, [searchParams]);

  // Show LoadingScreen during initial sync
  if (isInitialSync && isLoadingEvents) {
    return (
      <PageLayout>
        <LoadingScreen />
      </PageLayout>
    );
  }

  // Show ConnectNylas if no grant_id or grant status is not active
  if (!profile?.nylas_grant_id || (profile?.grant_status && profile.grant_status !== 'active')) {
    return (
      <PageLayout>
        <ConnectNylas />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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
    </PageLayout>
  );
}