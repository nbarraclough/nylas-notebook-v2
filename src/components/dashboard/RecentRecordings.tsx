import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VideoPlayerDialog } from "@/components/recordings/VideoPlayerDialog";

export function RecentRecordings() {
  const navigate = useNavigate();
  
  const { data: recordings, isLoading } = useQuery({
    queryKey: ['recent-recordings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            start_time
          ),
          video_url
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Your Recent Recordings</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-sm"
          onClick={() => navigate('/recordings')}
        >
          View more
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : recordings?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recordings yet. Start by recording your first meeting!
          </p>
        ) : (
          <div className="space-y-4">
            {recordings?.map((recording) => (
              <div
                key={recording.id}
                className="space-y-2 border-b pb-4 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm line-clamp-1">
                    {recording.event?.title}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {recording.event?.start_time && 
                      format(new Date(recording.event.start_time), 'MMM d')}
                  </div>
                </div>
                <div className="flex justify-end">
                  {recording.video_url ? (
                    <VideoPlayerDialog
                      videoUrl={recording.video_url}
                      title={recording.event?.title || ''}
                    />
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
}