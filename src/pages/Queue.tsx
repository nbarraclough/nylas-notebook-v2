
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { QueueCard } from "@/components/queue/QueueCard";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Queue() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

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

  const { data: recordings, isLoading, error } = useQuery({
    queryKey: ['recordings', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            end_time,
            conference_url,
            participants,
            organizer
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Recording Queue</h1>
          </div>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="space-y-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Recording Queue</h1>
          </div>
          <div className="text-red-500">
            Error loading recordings. Please try again later.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Recording Queue</h1>
          <div className="flex items-center">
            <Badge variant="outline" className="bg-blue-50">
              {recordings?.length || 0} recordings waiting
            </Badge>
          </div>
        </div>
        {recordings && recordings.length > 0 ? (
          <div className="grid gap-4">
            {recordings.map((recording) => (
              <QueueCard 
                key={recording.id} 
                recording={recording} 
                event={recording.event}
              />
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            No recordings currently queued.
          </div>
        )}
      </div>
    </PageLayout>
  );
}
