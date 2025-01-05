import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { OrganizationShares } from "@/components/dashboard/OrganizationShares";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { format } from "date-fns";
import { Calendar, Eye, Mail, MousePointerClick } from "lucide-react";

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

  // Fetch recent public shares with view counts and email metrics
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
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground">
                  Recent Public Shares
                </p>
                {publicShares?.map((share) => (
                  <div key={share.id} className="space-y-4 border-b pb-6 last:border-0">
                    <p className="text-2xl font-semibold">
                      {share.recording?.event?.title || 'Untitled Event'}
                    </p>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                        <span className="text-base">
                          {share.recording?.event?.start_time ? 
                            format(new Date(share.recording.event.start_time), 'MMMM do, yyyy') : 
                            'No date'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-500" />
                        <span className="text-xl font-medium">{share.recording?.views?.length || 0}</span>
                        <span className="text-muted-foreground">views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-purple-500" />
                        <span className="text-xl font-medium">{share.recording?.email_metrics?.[0]?.opens || 0}</span>
                        <span className="text-muted-foreground">opens</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MousePointerClick className="h-5 w-5 text-green-500" />
                        <span className="text-xl font-medium">{share.recording?.email_metrics?.[0]?.link_clicks || 0}</span>
                        <span className="text-muted-foreground">clicks</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!publicShares || publicShares.length === 0) && (
                  <p className="text-center py-8 text-muted-foreground">
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