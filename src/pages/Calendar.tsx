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
import { startOfWeek, endOfWeek } from "date-fns";
import type { Event } from "@/types/calendar";

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

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
    queryKey: ['events', userId, currentWeekStart],
    queryFn: async () => {
      if (!userId) return [];
      
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          notetaker_queue (
            id,
            status
          )
        `)
        .eq('user_id', userId)
        .gte('start_time', currentWeekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }
      
      // Transform the data to match our Event type
      const transformedEvents: Event[] = data.map(event => ({
        ...event,
        participants: event.participants as EventParticipant[],
        organizer: event.organizer as EventOrganizer,
      }));
      
      console.log('Fetched events:', transformedEvents);
      return transformedEvents;
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
              currentWeekStart={currentWeekStart}
              onWeekChange={setCurrentWeekStart}
            />
          </TabsContent>
          <TabsContent value="past">
            <EventsList 
              events={events || []} 
              isLoadingEvents={isLoadingEvents}
              userId={userId || ''}
              refetchEvents={refetchEvents}
              filter="past"
              currentWeekStart={currentWeekStart}
              onWeekChange={setCurrentWeekStart}
            />
          </TabsContent>
        </div>
      </Tabs>
    </PageLayout>
  );
}