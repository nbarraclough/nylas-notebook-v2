import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/calendar/EventCard";
import { useEffect, useState } from "react";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { StatsCard } from "@/components/dashboard/stats/StatsCard";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { OrganizationShares } from "@/components/dashboard/OrganizationShares";

export default function Index() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email);
      }
    };
    checkAuth();
  }, []);

  const { data: upcomingEvents, isLoading } = useQuery({
    queryKey: ['upcoming-events', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          conference_url,
          notetaker_queue (
            id,
            status
          )
        `)
        .eq('user_id', userId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) {
        console.error('Error fetching upcoming events:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userId
  });

  // Query for public video shares
  const { data: publicShares } = useQuery({
    queryKey: ['public-shares', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          recording:recordings (
            id,
            views:video_views (count),
            email_metrics:email_shares (opens, link_clicks),
            event:events (
              title,
              start_time
            )
          )
        `)
        .eq('shared_by', userId)
        .eq('share_type', 'external')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  return (
    <PageLayout>
      <div className="space-y-6">
        {userEmail && (
          <WelcomeCard email={userEmail} />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Meetings</h2>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-24 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      userId={userId || ''}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No upcoming meetings found
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <RecentRecordings />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <StatsCard publicShares={publicShares || []} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <OrganizationShares />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}