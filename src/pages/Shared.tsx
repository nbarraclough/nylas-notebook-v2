import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Link2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Shared() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [sharedVideos, setSharedVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  // Fetch shared videos
  useEffect(() => {
    const fetchSharedVideos = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          recording:recordings (
            id,
            event:events (
              title,
              description,
              start_time,
              participants
            ),
            views:video_views (
              id
            )
          )
        `)
        .eq('shared_by', userId);

      if (error) {
        console.error('Error fetching shared videos:', error);
        return;
      }

      setSharedVideos(data || []);
      setIsLoading(false);
    };

    if (userId) {
      fetchSharedVideos();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Shared Videos</h1>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Shared Videos</h1>
        
        {sharedVideos.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No shared videos found. Share a recording to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sharedVideos.map((share) => (
              <Card key={share.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {share.recording?.event?.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {share.recording?.event?.start_time && 
                      format(new Date(share.recording.event.start_time), "PPP")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {share.recording?.event?.description && (
                    <p className="text-sm text-muted-foreground">
                      {share.recording.event.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">
                        {share.recording?.views?.length || 0} views
                      </span>
                    </div>
                    {share.share_type === 'external' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/shared/${share.external_token}`;
                          navigator.clipboard.writeText(shareUrl);
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                        Copy Link
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}