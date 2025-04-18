import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { startOfDay, endOfDay } from "date-fns";
import { TeamInvite } from "./welcome/TeamInvite";

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
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">
        {profile?.first_name ? `Welcome back, ${profile.first_name}!` : 'Welcome back!'}
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
      
      <TeamInvite />
    </div>
  );
}