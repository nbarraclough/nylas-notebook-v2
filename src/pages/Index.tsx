import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/calendar/EventCard";
import { useEffect, useState } from "react";

export default function Index() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
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

      console.log('Fetched upcoming events:', data);
      return data;
    },
    enabled: !!userId
  });

  return (
    <PageLayout>
      <div className="space-y-6">
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
      </div>
    </PageLayout>
  );
}