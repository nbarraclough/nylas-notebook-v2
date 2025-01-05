import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NotetakerRecord } from "./types";

export function useNotetakers(userId: string) {
  return useQuery({
    queryKey: ['notetakers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          notetaker_id,
          event:events (
            title,
            start_time,
            manual_meeting:manual_meetings (
              title,
              meeting_url
            )
          )
        `)
        .eq('user_id', userId)
        .not('notetaker_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NotetakerRecord[];
    },
  });
}