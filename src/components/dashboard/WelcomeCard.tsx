import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startOfDay, endOfDay } from "date-fns";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WelcomeCardProps {
  email: string;
}

interface Participant {
  email: string;
}

interface Event {
  organizer: {
    email: string;
  };
  participants: Participant[];
}

export function WelcomeCard({ email }: WelcomeCardProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const firstName = email.split('@')[0]
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  const { data: todaysMeetings } = useQuery({
    queryKey: ['today-meetings'],
    queryFn: async () => {
      const today = new Date();
      const { data: events, error } = await supabase
        .from('events')
        .select('*, participants, organizer')
        .gte('start_time', startOfDay(today).toISOString())
        .lte('start_time', endOfDay(today).toISOString());

      if (error) throw error;

      const meetings = events || [];
      const internal = meetings.filter(event => {
        const organizerEmail = (event.organizer as Event['organizer'])?.email;
        const organizerDomain = organizerEmail?.split('@')[1];
        const participants = (event.participants as unknown as Participant[]) || [];
        return participants.every(
          p => p.email?.split('@')[1] === organizerDomain
        );
      });

      return {
        total: meetings.length,
        internal: internal.length,
        external: meetings.length - internal.length
      };
    }
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    
    setIsInviting(true);
    try {
      const response = await fetch('/api/send-organization-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      });
      
      if (!response.ok) throw new Error('Failed to send invite');
      
      toast({
        title: "Invitation sent!",
        description: `We've sent an invite to ${inviteEmail}`,
      });
      setInviteEmail("");
    } catch (error) {
      toast({
        title: "Failed to send invite",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">
        Welcome back, {firstName}!
      </h2>
      <div className="space-y-3">
        <p className="text-muted-foreground">
          You have <span className="font-medium text-foreground">{todaysMeetings?.total || 0}</span> meetings today
        </p>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50">
            {todaysMeetings?.internal || 0} Internal
          </Badge>
          <Badge variant="outline" className="bg-purple-50">
            {todaysMeetings?.external || 0} External
          </Badge>
        </div>
      </div>
      
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
          <Button onClick={handleInvite} disabled={isInviting}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>
    </div>
  );
}