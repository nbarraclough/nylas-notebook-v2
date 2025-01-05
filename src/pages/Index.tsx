import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RecentRecordings } from "@/components/dashboard/RecentRecordings";
import { OrganizationShares } from "@/components/dashboard/OrganizationShares";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";

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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Track your recording and sharing activity
                </p>
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