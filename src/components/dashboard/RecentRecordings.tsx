import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecordingCard } from "@/components/recordings/RecordingCard";

export function RecentRecordings() {
  const navigate = useNavigate();
  
  const { data: recordings, isLoading } = useQuery({
    queryKey: ['recent-recordings'],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return [];

      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer
          )
        `)
        .eq('user_id', profile.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!recordings?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recordings yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recordings.map((recording) => (
        <RecordingCard
          key={recording.id}
          recording={recording}
        />
      ))}
    </div>
  );
}