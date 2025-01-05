import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function OrganizationShares() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  
  const { data: shares, isLoading } = useQuery({
    queryKey: ['org-shares'],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('video_shares')
        .select(`
          *,
          recording:recordings (
            id,
            event:events (
              title,
              start_time
            )
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('share_type', 'internal')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    
    setIsInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session found');

      const response = await supabase.functions.invoke('send-organization-invite', {
        body: { email: inviteEmail },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteEmail}`,
      });
      setInviteEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Organization Shares</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-sm"
          onClick={() => navigate('/shared')}
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
        ) : shares?.length === 0 ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              No shared recordings in your organization yet.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
              <Button 
                onClick={handleInvite}
                disabled={!inviteEmail || isInviting}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isInviting ? "Inviting..." : "Invite"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {shares?.map((share) => (
              <div
                key={share.id}
                className="space-y-2 border-b pb-4 last:border-0"
              >
                <div className="space-y-1">
                  <p className="text-sm line-clamp-1">
                    {share.recording.event.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(share.recording.event.start_time), 'PPp')}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => navigate(`/shared/${share.external_token}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
}