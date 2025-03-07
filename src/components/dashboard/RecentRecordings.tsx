
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VideoPlayerDialog } from "@/components/recordings/VideoPlayerDialog";
import { Badge } from "@/components/ui/badge";
import { RecordingStatus } from "@/components/recordings/RecordingStatus";

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
            description,
            start_time
          ),
          video_url,
          mux_playback_id,
          transcript_content
        `)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  const getMuxPlaybackUrl = (playbackId: string): string => {
    return `https://stream.mux.com/${playbackId}.m3u8`;
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
            {recordings?.map((recording) => {
              // Check for video and transcript availability
              const hasVideo = !!recording.video_url || !!recording.recording_url || !!recording.mux_playback_id;
              const hasTranscript = !!recording.transcript_content;
              
              return (
                <div
                  key={recording.id}
                  className="p-4 rounded-lg border border-gray-100 bg-white/50 backdrop-blur-sm card-hover-effect"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium line-clamp-1">
                        {recording.event?.title || 'Untitled Recording'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-gray-500 mr-1" />
                          <span>
                            {recording.event?.start_time ? 
                              format(new Date(recording.event.start_time), 'MMM d, h:mm a') : 
                              'No date'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 sm:mt-0">
                      <RecordingStatus 
                        status={recording.status}
                        hasVideo={hasVideo}
                        hasTranscript={hasTranscript}
                        variant="compact"
                      />
                      
                      {recording.mux_playback_id ? (
                        <VideoPlayerDialog
                          videoUrl={getMuxPlaybackUrl(recording.mux_playback_id)}
                          title={recording.event?.title || ''}
                        >
                          <Button size="sm" variant="ghost" className="hover:bg-blue-50 ml-2">
                            <Play className="h-4 w-4" />
                          </Button>
                        </VideoPlayerDialog>
                      ) : (
                        <Button size="sm" variant="ghost" disabled className="ml-2">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
