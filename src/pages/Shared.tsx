import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Link2, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Shared() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  // Fetch shared videos with recording and event details
  const { data: sharedVideos, isLoading } = useQuery({
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
            video_url,
            status,
            event:events (
              title,
              description,
              start_time,
              end_time,
              participants,
              organizer
            ),
            views:video_views (
              id,
              viewer_id,
              external_viewer_ip,
              viewed_at
            )
          )
        `)
        .eq('shared_by', userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleRevokeAccess = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('video_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      // Invalidate the query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['shared-videos', userId] });

      toast({
        title: "Access revoked",
        description: "The video share has been revoked successfully.",
      });
    } catch (error) {
      console.error('Error revoking access:', error);
      toast({
        title: "Error",
        description: "Failed to revoke access. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderVideoCard = (share: any) => (
    <Card key={share.id} className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">
          {share.recording?.event?.title}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {format(new Date(share.recording?.event?.start_time), "PPP")}
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
            <span className="text-sm">{share.recording?.views?.length || 0} views</span>
          </div>
          <div className="flex items-center space-x-2">
            {share.share_type === 'external' && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/shared/${share.external_token}`;
                  navigator.clipboard.writeText(shareUrl);
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

        {share.share_type === 'external' && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <input
              type="text"
              value={`${window.location.origin}/shared/${share.external_token}`}
              readOnly
              className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            />
          </div>
        )}

        <div className="text-sm space-y-1">
          <div className="font-medium">Participants:</div>
          <div className="text-muted-foreground">
            {share.recording?.event?.participants?.map((participant: any, index: number) => (
              <div key={index}>
                {participant.name} ({participant.email})
              </div>
            ))}
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