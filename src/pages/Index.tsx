import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { StatsCard } from "@/components/dashboard/stats/StatsCard";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";
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

  // First, fetch the profile
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

  // Finally fetch public shares after profile is loaded
  const { data: publicShares, isLoading: sharesLoading } = useQuery({
    queryKey: ['public-shares', profile?.id],
    queryFn: async () => {
      if (!profile?.id) {
        console.log('No profile ID available, skipping shares fetch');
        return [];
      }

      console.log('Fetching public shares for user:', profile.id);
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          id,
          recording:recordings (
            id,
            views:video_views(count),
            email_metrics:email_shares(opens, link_clicks),
            event:events (
              title,
              start_time
            )
          )
        `)
        .eq('shared_by', profile.id)
        .eq('share_type', 'external')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching public shares:', error);
        throw error;
      }

      return data;
    },
    enabled: !!profile?.id,
    retry: false
  });

  if (profileLoading || sharesLoading) {
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
              <StatsCard publicShares={publicShares || []} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row - Responsive grid with improved mobile layout */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          <Card className="card-hover-effect min-h-[300px]">
            <CardContent className="p-4 sm:p-6 h-full">
              <RecentRecordings />
            </CardContent>
          </Card>
          <Card className="card-hover-effect min-h-[300px]">
            <CardContent className="p-4 sm:p-6 h-full">
              <h3 className="text-lg font-semibold mb-4">Upcoming Meetings</h3>
              <UpcomingMeetings userId={profile?.id || ''} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}