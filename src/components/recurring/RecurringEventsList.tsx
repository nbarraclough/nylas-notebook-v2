
import { Card } from "@/components/ui/card";
import { EventCard } from "./EventCard";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { StickyNote, Calendar } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Group events by participant count (1:1 vs Group)
  const groupedEvents = Object.entries(recurringEvents || {}).reduce((acc, [masterId, events]) => {
    if (!events || events.length === 0) return acc;
    
    const latestEvent = events[0];
    if (!latestEvent) return acc;

    const participantCount = latestEvent.participants?.length || 0;
    const isOneOnOne = participantCount === 2; // 2 participants = 1:1 meeting
    
    const nextEvent = events.find(event => new Date(event.start_time) > new Date());
    const recordingsCount = events.reduce((count, event) => 
      count + (event.recordings?.length || 0), 0
    );

    const notes = events.flatMap(event => 
      event.recurring_event_notes?.map((note: any) => ({
        content: note?.content || '',
        masterId
      })) || []
    );

    const eventData = {
      masterId,
      latestEvent,
      nextEvent,
      recordingsCount,
      notes
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

  // Search through events and notes
  const searchResults = Object.entries(recurringEvents || {}).flatMap(([masterId, events]) => {
    if (!events || events.length === 0) return [];
    
    const results = [];
    const latestEvent = events[0];
    if (!latestEvent) return [];
    
    // Search in event title
    if (latestEvent.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      results.push({
        type: 'event',
        masterId,
        text: latestEvent.title,
        event: latestEvent
      });
    }
    
    // Search in notes
    events.forEach(event => {
      if (!event.recurring_event_notes) return;
      
      event.recurring_event_notes.forEach((note: any) => {
        if (note?.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            type: 'note',
            masterId,
            text: note.content,
            event: latestEvent
          });
        }
      });
    });
    
    return results;
  });

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
      {/* Search Command */}
      <div className="w-full">
        <Command className="rounded-lg border shadow-md">
          <CommandInput 
            placeholder="Search events and notes..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {searchQuery && (
            <ScrollArea className="max-h-[300px]">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {searchResults.map((result, index) => (
                  <CommandItem
                    key={`${result.masterId}-${index}`}
                    value={result.text}
                    className="flex items-center gap-2 p-2"
                  >
                    {result.type === 'note' ? (
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {result.type === 'note' ? 'Note: ' : ''}
                        {result.text.length > 100 
                          ? result.text.substring(0, 100) + '...' 
                          : result.text}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {result.event.title}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          )}
        </Command>
      </div>

      {/* 1:1 Meetings Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">1:1 Meetings ({groupedEvents.oneOnOne?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groupedEvents.oneOnOne || []).map((event) => (
            <EventCard
              key={event.masterId}
              event={event}
            />
          ))}
        </div>
      </section>

      {/* Group Meetings Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Group Meetings ({groupedEvents.group?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groupedEvents.group || []).map((event) => (
            <EventCard
              key={event.masterId}
              event={event}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
