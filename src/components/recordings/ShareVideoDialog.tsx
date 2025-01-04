import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

interface ShareVideoDialogProps {
  recordingId: string;
}

export function ShareVideoDialog({ recordingId }: ShareVideoDialogProps) {
  const { toast } = useToast();
  const session = useSession();
  const [isInternalEnabled, setIsInternalEnabled] = useState(false);
  const [isExternalEnabled, setIsExternalEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      
      // Get current user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (isInternalEnabled) {
        await supabase.from('video_shares').insert({
          recording_id: recordingId,
          share_type: 'internal',
          organization_id: profile?.organization_id,
          shared_by: session.user.id
        });
      }

      if (isExternalEnabled) {
        await supabase.from('video_shares').insert({
          recording_id: recordingId,
          share_type: 'external',
          shared_by: session.user.id
        });
      }

      toast({
        title: "Video shared successfully",
        description: "The sharing settings have been updated."
      });
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: "Error sharing video",
        description: "There was a problem updating the sharing settings.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Recording</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Share with Organization</Label>
              <p className="text-sm text-muted-foreground">
                Make this recording available to everyone in your organization
              </p>
            </div>
            <Switch
              checked={isInternalEnabled}
              onCheckedChange={setIsInternalEnabled}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Create Public Link</Label>
              <p className="text-sm text-muted-foreground">
                Generate a link that can be shared with anyone
              </p>
            </div>
            <Switch
              checked={isExternalEnabled}
              onCheckedChange={setIsExternalEnabled}
            />
          </div>
          <Button 
            onClick={handleShare} 
            disabled={!isInternalEnabled && !isExternalEnabled}
            className="w-full"
            isLoading={isLoading}
          >
            Share Recording
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}