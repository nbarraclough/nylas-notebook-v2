import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Link2, Share2, Trash2 } from "lucide-react";

export default function Shared() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

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
  }, []);

  // Fetch shared videos
  const { data: sharedVideos, isLoading, error } = useQuery({
    queryKey: ['shared-videos', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          recording:recordings (
            id,
            recording_url,
            event:events (
              title,
              start_time
            )
          ),
          views:video_views (
            id,
            viewer_id,
            external_viewer_ip,
            viewed_at
          )
        `)
        .eq('shared_by', userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleRevokeAccess = async (shareId: string) => {
    const { error } = await supabase
      .from('video_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      toast({
        title: "Error revoking access",
        description: "There was a problem revoking access to this video.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Access revoked",
      description: "The video share has been revoked successfully.",
    });
  };

  const renderVideoCard = (share: any) => (
    <Card key={share.id} className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">
          {share.recording.event.title}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Shared on {new Date(share.created_at).toLocaleDateString()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>{share.views?.length || 0} views</span>
          </div>
          <div className="flex items-center space-x-2">
            {share.share_type === 'external' && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/shared/${share.external_token}`
                  );
                  toast({
                    title: "Link copied",
                    description: "The sharing link has been copied to your clipboard.",
                  });
                }}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleRevokeAccess(share.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke Access
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
        
        <Tabs defaultValue="internal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">Internal Shares</TabsTrigger>
            <TabsTrigger value="external">External Shares</TabsTrigger>
          </TabsList>
          
          <TabsContent value="internal">
            <div className="space-y-4">
              {sharedVideos
                ?.filter(share => share.share_type === 'internal')
                .map(renderVideoCard)}
              {sharedVideos?.filter(share => share.share_type === 'internal').length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No internal video shares found. Share a video with your organization to see it here.
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="external">
            <div className="space-y-4">
              {sharedVideos
                ?.filter(share => share.share_type === 'external')
                .map(renderVideoCard)}
              {sharedVideos?.filter(share => share.share_type === 'external').length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No external video shares found. Create a public link to share videos externally.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}