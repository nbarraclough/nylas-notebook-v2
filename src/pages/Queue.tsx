import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { QueueCard } from "@/components/queue/QueueCard";
import { useQuery } from "@tanstack/react-query";
import type { NotetakerQueue } from "@/integrations/supabase/types";

export default function Queue() {
  const navigate = useNavigate();
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

  const { data: queueItems, isLoading, error } = useQuery({
    queryKey: ['queue', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('notetaker_queue')
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
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as (NotetakerQueue & { event: any })[];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Recording Queue</h1>
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
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Recording Queue</h1>
          <div className="text-red-500">
            Error loading queue items. Please try again later.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Recording Queue</h1>
        {queueItems && queueItems.length > 0 ? (
          <div className="grid gap-4">
            {queueItems.map((item) => (
              <QueueCard key={item.id} queueItem={item} />
            ))}
          </div>
        ) : (
          <div className="text-gray-500">
            No recordings currently queued.
          </div>
        )}
      </div>
    </PageLayout>
  );
}
