import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { startOfDay, endOfDay } from "date-fns";

interface WelcomeCardProps {
  email: string;
}

interface Participant {
  email: string;
}

export function WelcomeCard({ email }: WelcomeCardProps) {
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
        const organizerEmail = event.organizer?.email as string;
        const organizerDomain = organizerEmail?.split('@')[1];
        const participants = (event.participants as Participant[]) || [];
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
    </div>
  );
}