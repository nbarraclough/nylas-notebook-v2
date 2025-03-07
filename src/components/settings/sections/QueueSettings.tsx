
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QueueCard } from "@/components/queue/QueueCard";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { NotetakerQueue } from "@/integrations/supabase/types/notetaker-queue";

export function QueueSettings({ userId }: { userId: string }) {
  const { toast } = useToast();

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
        Error loading recordings. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
  );
}
