import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { OrganizationShares } from "@/components/dashboard/OrganizationShares";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { format } from "date-fns";
import { Calendar, Eye } from "lucide-react";

export default function Index() {
  const [userEmail, setUserEmail] = useState<string>("");

  // Fetch user profile
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

  // Fetch recent public shares with view counts
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
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Welcome to Notebook</CardTitle>
            </CardHeader>
            <CardContent>
              <WelcomeCard email={userEmail} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Recent Public Shares
                </p>
                {publicShares?.map((share) => (
                  <div key={share.id} className="space-y-2 border-b pb-2 last:border-0">
                    <p className="font-medium">
                      {share.recording?.event?.title || 'Untitled Event'}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {share.recording?.event?.start_time ? 
                          format(new Date(share.recording.event.start_time), 'PPP') : 
                          'No date'
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {share.recording?.views?.length || 0} views
                      </div>
                    </div>
                  </div>
                ))}
                {(!publicShares || publicShares.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No public shares yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid gap-4 md:grid-cols-2">
          <RecentRecordings />
          <OrganizationShares />
        </div>
      </div>
    </PageLayout>
  );
}