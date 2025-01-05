import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function TeamInvite() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

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
    <div className="border-t pt-4 mt-6">
      <p className="text-sm text-muted-foreground mb-4">
        Notebook is better when your team records all of their meetings. Invite your colleagues to join!
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="colleague@company.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleInvite} disabled={isInviting} className="text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </div>
    </div>
  );
}