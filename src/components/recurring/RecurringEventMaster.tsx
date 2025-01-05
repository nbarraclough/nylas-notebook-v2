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
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

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

  const handleToggleExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  return (
    <EventList
      events={events}
      expandedEvents={expandedEvents}
      onToggleExpand={handleToggleExpand}
      onSelectRecording={onSelectRecording}
      isUpcoming={isUpcoming}
      isLoading={isLoading}
    />
  );
}