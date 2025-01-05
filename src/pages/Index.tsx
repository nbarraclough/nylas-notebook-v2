import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { OrganizationShares } from "@/components/dashboard/OrganizationShares";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { format } from "date-fns";
import { Calendar, Eye, Mail, MousePointerClick, ArrowRight } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
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
            <CardContent className="pt-6">
              <WelcomeCard email={userEmail} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="font-semibold">Quick Stats</h3>
              <Button 
                variant="ghost" 
                className="text-sm" 
                onClick={() => navigate("/shared?tab=external")}
              >
                View more
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {publicShares?.map((share) => (
                  <div key={share.id} className="space-y-2 border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium line-clamp-1">
                        {share.recording?.event?.title || 'Untitled Event'}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {share.recording?.event?.start_time ? 
                            format(new Date(share.recording.event.start_time), 'MMM d') : 
                            'No date'
                          }
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span>{share.recording?.views?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-purple-500" />
                        <span>{share.recording?.email_metrics?.[0]?.opens || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointerClick className="h-4 w-4 text-green-500" />
                        <span>{share.recording?.email_metrics?.[0]?.link_clicks || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!publicShares || publicShares.length === 0) && (
                  <p className="text-center py-4 text-muted-foreground">
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
