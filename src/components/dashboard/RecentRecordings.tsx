import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VideoPlayerDialog } from "@/components/recordings/VideoPlayerDialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function RecentRecordings() {
  const navigate = useNavigate();
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  
  const { data: recordings, isLoading } = useQuery({
    queryKey: ['recent-recordings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time
          ),
          video_url,
          mux_playback_id
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h3 className="text-lg font-semibold tracking-tight">Your Recent Recordings</h3>
        <Button 
          variant="ghost" 
          className="text-sm hover:bg-blue-50" 
          onClick={() => navigate("/library")}
        >
          <span className="hidden sm:inline">View more</span>
          <ArrowRight className="h-4 w-4 ml-0 sm:ml-2" />
        </Button>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : recordings?.length === 0 ? (
          <div className="text-center py-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <p className="text-muted-foreground">
              No recordings yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings?.map((recording) => (
              <div
                key={recording.id}
                className="p-4 rounded-lg border border-gray-100 bg-white/50 backdrop-blur-sm card-hover-effect"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-1 flex-1 mr-2">
                    <p className="text-sm font-medium line-clamp-1">
                      {recording.event?.title || 'Untitled Recording'}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(recording.status)} border-0`}
                    >
                      {recording.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      {recording.event?.start_time ? 
                        format(new Date(recording.event.start_time), 'MMM d, h:mm a') : 
                        'No date'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  {recording.mux_playback_id ? (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="hover:bg-blue-50"
                      onClick={() => setSelectedRecordingId(recording.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
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
      </div>

      <VideoPlayerDialog
        open={!!selectedRecordingId}
        onOpenChange={(open) => !open && setSelectedRecordingId(null)}
        recordingId={selectedRecordingId || ''}
      />
    </div>
  );
}