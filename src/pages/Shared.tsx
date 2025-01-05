import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Shared() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
          id,
          external_token,
          share_type,
          recording:recordings (
            id,
            event:events (
              title,
              description,
              start_time,
              end_time,
              participants
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

  const handleCopyLink = (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "The share link has been copied to your clipboard.",
    });
  };

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedVideos.map((share) => (
              <Card key={share.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">
                        {share.recording?.event?.title}
                      </h3>
                      {share.recording?.event?.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {share.recording.event.description}
                        </p>
                      )}
                    </div>
                    
                    {share.share_type === 'external' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => handleCopyLink(share.external_token)}
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