import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QueueCard } from "@/components/queue/QueueCard";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { NotetakerQueue } from "@/integrations/supabase/types/notetaker-queue";

export function QueueSettings({ userId }: { userId: string }) {
  const { toast } = useToast();

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
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading queue items. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {queueItems && queueItems.length > 0 ? (
        <div className="grid gap-4">
          {queueItems.map((item) => (
            <QueueCard key={item.id} queueItem={item} />
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">
          No recordings currently queued.
        </div>
      )}
    </div>
  );
}