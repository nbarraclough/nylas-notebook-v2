
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState<string>("all");
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

    const eventData = {
      masterId,
      latestEvent,
      nextEvent,
      recordingsCount,
      isPinned: events.some(event => event.recurring_event_notes?.some((note: any) => note.pinned))
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
      const { error } = await supabase
        .from('recurring_event_notes')
        .update({ pinned: !currentPinned })
        .eq('master_event_id', masterId);

      if (error) throw error;

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
    <Tabs defaultValue="all" className="space-y-4" onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="oneOnOne">1:1 Meetings ({groupedEvents.oneOnOne?.length || 0})</TabsTrigger>
        <TabsTrigger value="group">Group Meetings ({groupedEvents.group?.length || 0})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-4">
        {[...(groupedEvents.oneOnOne || []), ...(groupedEvents.group || [])]
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
      </TabsContent>

      <TabsContent value="oneOnOne" className="space-y-4">
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
      </TabsContent>

      <TabsContent value="group" className="space-y-4">
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
      </TabsContent>
    </Tabs>
  );
}
