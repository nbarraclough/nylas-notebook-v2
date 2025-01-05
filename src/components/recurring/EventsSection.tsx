import { EventCard } from "./EventCard";

interface EventsSectionProps {
  title: string;
  events: any[];
  onTogglePin: (masterId: string, currentPinned: boolean) => Promise<void>;
}

export function EventsSection({ title, events, onTogglePin }: EventsSectionProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map(event => (
          <EventCard 
            key={event.masterId} 
            event={event} 
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </div>
  );
}