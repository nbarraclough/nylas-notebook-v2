
import { Card } from "@/components/ui/card";
import { EventCard } from "./EventCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecurringEventsListProps {
  recurringEvents: Record<string, any[]>;
  isLoading: boolean;
  filters: {
    participants: string[];
    startDate: Date | null;
    endDate: Date | null;
    searchQuery: string | null;
  };
}

export function RecurringEventsList({ recurringEvents, isLoading, filters }: RecurringEventsListProps) {
  const { toast } = useToast();

  // Group events by participant count (1:1 vs Group)
  const groupedEvents = Object.entries(recurringEvents).reduce((acc, [masterId, events]) => {
    if (!events || events.length === 0) return acc;
    
    const latestEvent = events[0];
    const participantCount = latestEvent.participants?.length || 0;
    const isOneOnOne = participantCount === 2; // 2 participants = 1:1 meeting
    
    const nextEvent = events.find(event => new Date(event.start_time) > new Date());
    const recordingsCount = events.reduce((count, event) => 
      count + (event.recordings?.length || 0), 0
    );

    // Find if any note is pinned for this recurring event
    const isPinned = events.some(event => 
      event.recurring_event_notes?.some((note: any) => note.pinned)
    );

    const eventData = {
      masterId,
      latestEvent,
      nextEvent,
      recordingsCount,
      isPinned
    };

    if (isOneOnOne) {
      if (!acc.oneOnOne) acc.oneOnOne = [];
      acc.oneOnOne.push(eventData);
    } else {
      if (!acc.group) acc.group = [];
      acc.group.push(eventData);
    }

    return acc;
  }, { oneOnOne: [], group: [] } as Record<string, any[]>);

  const handleTogglePin = async (masterId: string, currentPinned: boolean) => {
    try {
      // First get any existing note for this master event
      const { data: existingNotes, error: fetchError } = await supabase
        .from('recurring_event_notes')
        .select('*')
        .eq('master_event_id', masterId)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      if (fetchError) {
        throw fetchError;
      }

      if (existingNotes) {
        // Update existing note
        const { error } = await supabase
          .from('recurring_event_notes')
          .update({ pinned: !currentPinned })
          .eq('master_event_id', masterId);

        if (error) throw error;
      } else {
        // Create new note with pin
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const { error } = await supabase
          .from('recurring_event_notes')
          .insert({
            master_event_id: masterId,
            pinned: true,
            content: '',
            user_id: userData.user.id // Add user_id for RLS
          });

        if (error) throw error;
      }

      toast({
        title: currentPinned ? "Event unpinned" : "Event pinned",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const totalEvents = (groupedEvents.oneOnOne?.length || 0) + (groupedEvents.group?.length || 0);

  if (totalEvents === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          No recurring events found
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1:1 Meetings Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">1:1 Meetings ({groupedEvents.oneOnOne?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groupedEvents.oneOnOne || [])
            .sort((a, b) => {
              const aIsPinned = a.isPinned ? 1 : 0;
              const bIsPinned = b.isPinned ? 1 : 0;
              return bIsPinned - aIsPinned;
            })
            .map((event) => (
              <EventCard
                key={event.masterId}
                event={event}
                onTogglePin={handleTogglePin}
              />
            ))}
        </div>
      </section>

      {/* Group Meetings Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Group Meetings ({groupedEvents.group?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groupedEvents.group || [])
            .sort((a, b) => {
              const aIsPinned = a.isPinned ? 1 : 0;
              const bIsPinned = b.isPinned ? 1 : 0;
              return bIsPinned - aIsPinned;
            })
            .map((event) => (
              <EventCard
                key={event.masterId}
                event={event}
                onTogglePin={handleTogglePin}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
