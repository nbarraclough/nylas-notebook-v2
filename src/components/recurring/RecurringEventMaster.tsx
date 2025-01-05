import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RecurringEventInstances } from "./RecurringEventInstances";
import { RecurringEventNotes } from "./RecurringEventNotes";

interface RecurringEventMasterProps {
  masterId: string;
  events: any[];
  notes: any[];
  onSaveNotes: (masterId: string, content: string) => Promise<void>;
}

export function RecurringEventMaster({ masterId, events, notes, onSaveNotes }: RecurringEventMasterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const latestEvent = events[0]; // Events are already sorted by date

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{latestEvent.title}</h3>
              <p className="text-sm text-muted-foreground">
                {events.length} occurrences
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
              <div className="space-y-4">
                <RecurringEventInstances events={events} />
              </div>
              <div>
                <RecurringEventNotes 
                  masterId={masterId}
                  initialContent={notes[0]?.content || ''}
                  onSave={onSaveNotes}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}