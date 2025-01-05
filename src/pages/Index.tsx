import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { StatsCard } from "@/components/dashboard/stats/StatsCard";
import { EventCard } from "@/components/calendar/EventCard";

export default function Index() {
  const [userEmail, setUserEmail] = useState<string>("");

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserEmail(data.email);
      return data;
    }
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  const { data: publicShares } = useQuery({
    queryKey: ['public-shares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          id,
          recording:recordings (
            id,
            event:events (
              title,
              start_time
            ),
            views:video_views (
              id
            ),
            email_metrics:email_shares (
              opens,
              link_clicks
            )
          )
        `)
        .eq('share_type', 'external')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  return (
    <PageLayout>
      <div className="space-y-8">
        {/* Top row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-2 card-hover-effect">
            <CardContent className="pt-6">
              <WelcomeCard email={userEmail} />
            </CardContent>
          </Card>
          
          <Card className="card-hover-effect">
            <CardContent className="pt-6">
              <StatsCard publicShares={publicShares || []} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-hover-effect">
            <RecentRecordings />
          </Card>
          <Card className="card-hover-effect">
            <CardContent className="pt-6">
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