import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function OrganizationShares() {
  const navigate = useNavigate();
  
  const { data: shares, isLoading } = useQuery({
    queryKey: ['org-shares'],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          recording:recordings (
            id,
            event:events (
              title,
              start_time
            )
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('share_type', 'internal')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Organization Shares</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/shared')}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : shares?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No shared recordings in your organization yet.
          </p>
        ) : (
          <div className="space-y-4">
            {shares?.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {share.recording.event.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(share.recording.event.start_time), 'PPp')}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => navigate(`/shared/${share.external_token}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}