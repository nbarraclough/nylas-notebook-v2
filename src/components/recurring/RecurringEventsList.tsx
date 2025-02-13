import { Card } from "@/components/ui/card";
import { EventCard } from "./EventCard";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { StickyNote, Calendar, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface RecurringEventsListProps {
  recurringEvents: Record<string, any>;
  isLoading: boolean;
  filters: {
    participants: string[];
    startDate: Date | null;
    endDate: Date | null;
    searchQuery: string | null;
  };
  searchOnly?: boolean;
}

// Helper function to strip HTML tags
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Helper function to highlight search matches
const highlightMatches = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? 
      <strong key={i} className="font-bold bg-yellow-100 dark:bg-yellow-900">{part}</strong> : 
      part
  );
};

export function RecurringEventsList({ recurringEvents, isLoading, filters, searchOnly = false }: RecurringEventsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Group events by participant count (1:1 vs Group)
  const groupedEvents = Object.entries(recurringEvents || {}).reduce((acc, [masterId, eventData]) => {
    if (!eventData || !eventData.latestEvent) return acc;
    
    const participantCount = eventData.latestEvent.participants?.length || 0;
    const isOneOnOne = participantCount === 2; // 2 participants = 1:1 meeting
    
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
  const searchResults = Object.entries(recurringEvents || {}).flatMap(([masterId, eventData]) => {
    if (!eventData || !eventData.latestEvent) return [];
    
    const results = [];
    const latestEvent = eventData.latestEvent;
    
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
    eventData.notes?.forEach((note: any) => {
      if (note?.content) {
        const plainTextContent = stripHtml(note.content);
        if (plainTextContent.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            type: 'note',
            masterId,
            text: plainTextContent,
            event: latestEvent
          });
        }
      }
    });
    
    return results;
  });

  if (searchOnly) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            Search events and notes...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[400px]" align="end">
          <Command>
            <CommandInput 
              placeholder="Search events and notes..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {searchQuery === "" ? null : (
                <>
                  {searchResults.length === 0 ? (
                    <CommandEmpty>No results found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {searchResults.map((result, index) => (
                        <CommandItem
                          key={`${result.masterId}-${index}`}
                          value={result.text}
                          className="flex items-center gap-2 p-2"
                          onSelect={() => {
                            setOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          <Link 
                            to={`/recurring-event-series/${result.masterId}`}
                            className="flex items-center gap-2 w-full"
                          >
                            {result.type === 'note' ? (
                              <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="flex flex-col overflow-hidden">
                              <div className="font-medium truncate">
                                {result.type === 'note' && (
                                  <span className="text-muted-foreground">Note: </span>
                                )}
                                {highlightMatches(
                                  result.text.length > 100 
                                    ? result.text.substring(0, 100) + '...' 
                                    : result.text,
                                  searchQuery
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground truncate">
                                {result.event.title}
                              </span>
                            </div>
                          </Link>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

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
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1:1 Meetings ({groupedEvents.oneOnOne?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(groupedEvents.oneOnOne || []).map((event) => (
            <EventCard
              key={event.masterId}
              event={event}
            />
          ))}
        </div>
      </section>

      {/* Group Meetings Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Group Meetings ({groupedEvents.group?.length || 0})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
