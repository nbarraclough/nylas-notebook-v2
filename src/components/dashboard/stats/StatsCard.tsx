import { Button } from "@/components/ui/button";
import { Calendar, Eye, Mail, MousePointerClick, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StatsCard() {
  const navigate = useNavigate();

  const { data: publicShares, isLoading } = useQuery({
    queryKey: ['public-shares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          id,
          recording:recordings (
            id,
            views:video_views!inner (
              id,
              viewed_at
            ),
            email_metrics:email_shares(opens, link_clicks),
            event:events (
              title,
              start_time
            )
          )
        `)
        .eq('share_type', 'external')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <h3 className="text-lg font-semibold tracking-tight">Public Links</h3>
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h3 className="text-lg font-semibold tracking-tight">Public Links</h3>
        <Button 
          variant="ghost" 
          className="text-sm hover:bg-blue-50" 
          onClick={() => navigate("/library?filter=public")}
        >
          <span className="hidden sm:inline">View more</span>
          <ArrowRight className="h-4 w-4 ml-0 sm:ml-2" />
        </Button>
      </div>
      <div className="space-y-4">
        {publicShares && publicShares.length > 0 ? (
          publicShares.map((share) => (
            <div 
              key={share.id} 
              className="p-4 rounded-lg border border-gray-100 bg-white/50 backdrop-blur-sm card-hover-effect"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium line-clamp-1 flex-1 mr-2">
                  {share.recording?.event?.title || 'Untitled Event'}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>
                    {share.recording?.event?.start_time ? 
                      format(new Date(share.recording.event.start_time), 'MMM d') : 
                      'No date'
                    }
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-700 font-medium">
                    {share.recording?.views?.length || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50">
                  <Mail className="h-4 w-4 text-purple-500" />
                  <span className="text-purple-700 font-medium">{share.recording?.email_metrics?.[0]?.opens || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50">
                  <MousePointerClick className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 font-medium">{share.recording?.email_metrics?.[0]?.link_clicks || 0}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <p className="text-muted-foreground">
              No public shares yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}