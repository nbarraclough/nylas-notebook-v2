import { useState } from "react";
import { EventList } from "./EventList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RecurringEventMasterProps {
  masterId: string;
  events: any[];
  onSelectRecording: (recordingId: string) => void;
  isUpcoming?: boolean;
}

export function RecurringEventMaster({ 
  masterId, 
  events,
  onSelectRecording,
  isUpcoming = false 
}: RecurringEventMasterProps) {
  const { isLoading } = useQuery({
    queryKey: ['recurring-events', masterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          recordings (
            id,
            recording_url,
            video_url,
            duration,
            transcript_content
          )
        `)
        .eq('master_event_id', masterId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <EventList
      events={events}
      masterId={masterId}
      isLoading={isLoading}
    />
  );
}