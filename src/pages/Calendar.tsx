import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ConnectNylas } from "@/components/calendar/ConnectNylas";
import { EventsList } from "@/components/calendar/EventsList";

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
        const { error: syncError } = await supabase.functions.invoke('sync-nylas-events', {
          body: { user_id: session.user.id }
        });
        if (syncError) {
          console.error('Error in initial sync:', syncError);
        } else {
          refetchEvents();
        }
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
  }, [navigate, toast, events, refetchEvents]);

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

  return (
    <PageLayout>
      {!isNylasAuthenticated ? (
        <ConnectNylas />
      ) : (
        <EventsList 
          events={events || []} 
          isLoadingEvents={isLoadingEvents}
          userId={userId || ''}
          refetchEvents={refetchEvents}
        />
      )}
    </PageLayout>
  );
}