import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Check } from "lucide-react";
import { NotetakerPopoverContent } from "./NotetakerPopoverContent";
import { useNotetakerMutation } from "./useNotetakerMutation";

export function SendNotetaker() {
  const [meetingInfo, setMeetingInfo] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    setMeetingInfo("");
  };

  const mutation = useNotetakerMutation(() => {
    setMeetingInfo("");
    setIsOpen(false);
  });

  const handleSend = () => {
    if (!meetingInfo.trim()) return;
    mutation.mutate(meetingInfo);
  };

  if (mutation.isSuccess) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 text-green-600 border-green-600"
        disabled
      >
        <Check className="h-4 w-4" />
        Sent
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Send className="h-4 w-4" />
          Send Notetaker
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <NotetakerPopoverContent
          meetingInfo={meetingInfo}
          setMeetingInfo={setMeetingInfo}
          handleClear={handleClear}
          handleSend={handleSend}
          isPending={mutation.isPending}
        />
      </PopoverContent>
    </Popover>
  );
}