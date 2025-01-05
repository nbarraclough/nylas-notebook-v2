import { Button } from "@/components/ui/button";

interface EventActionsProps {
  conferenceUrl: string | null;
  isPast: boolean;
  isCalendarRoute: boolean;
}

export const EventActions = ({
  conferenceUrl,
  isPast,
  isCalendarRoute
}: EventActionsProps) => {
  if (isPast) return null;

  return (
    <div className="flex flex-col gap-2">
      {conferenceUrl && (
        <div className="flex justify-start">
          <Button 
            variant="outline"
            size="sm"
            className="w-full sm:w-auto hover:bg-accent"
            asChild
          >
            <a 
              href={conferenceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Join meeting
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};