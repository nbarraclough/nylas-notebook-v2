import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Recent Recordings</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/recordings')}
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
        ) : recordings?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recordings yet. Start by recording your first meeting!
          </p>
        ) : (
          <div className="space-y-4">
            {recordings?.map((recording) => (
              <div
                key={recording.id}
                className="flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {recording.event.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(recording.event.start_time), 'PPp')}
                  </p>
                </div>
                <Button size="sm" variant="ghost">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}