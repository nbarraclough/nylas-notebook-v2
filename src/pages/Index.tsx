import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { StatsCard } from "@/components/dashboard/stats/StatsCard";
import { EventCard } from "@/components/calendar/EventCard";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const [userEmail, setUserEmail] = useState<string>("");
  const navigate = useNavigate();

  // Check for active session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session found, redirecting to auth');
        navigate('/auth');
        return;
      }
    };
    
    checkSession();
  }, [navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found in auth state');
        throw new Error('No user found');
      }
      
      console.log('Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      setUserEmail(data.email);
      return data;
    },
    retry: false
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      if (!profile?.id) {
        console.log('No profile ID available, skipping events fetch');
        return [];
      }

      console.log('Fetching upcoming events for user:', profile.id);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return data;
    },
    enabled: !!profile?.id,
    retry: false
  });

  if (profileLoading || eventsLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4 px-4 sm:px-0">
          <div className="h-40 bg-gray-200 rounded-lg" />
          <div className="h-60 bg-gray-200 rounded-lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6 px-4 sm:px-0">
        {/* Top row - Responsive grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1 md:col-span-2 card-hover-effect">
            <CardContent className="p-4 sm:p-6">
              <WelcomeCard email={userEmail} />
            </CardContent>
          </Card>
          
          <Card className="card-hover-effect">
            <CardContent className="p-4 sm:p-6">
              <StatsCard publicShares={[]} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row - Responsive grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-hover-effect">
            <CardContent className="p-4 sm:p-6">
              <RecentRecordings />
            </CardContent>
          </Card>
          <Card className="card-hover-effect">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Upcoming Meetings</h3>
              <div className="space-y-4">
                {upcomingEvents?.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userId={profile?.id || ''}
                    isPast={false}
                  />
                ))}
                {(!upcomingEvents || upcomingEvents.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    No upcoming meetings. Time to relax!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}