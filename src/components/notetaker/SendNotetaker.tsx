import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Check, X } from "lucide-react";
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

  const getButtonContent = () => {
    if (mutation.isSuccess) {
      return (
        <>
          <Check className="h-4 w-4" />
          Sent ✅
        </>
      );
    }
    if (mutation.isError) {
      return (
        <>
          <X className="h-4 w-4" />
          Failed ❌
        </>
      );
    }
    return (
      <>
        <Send className="h-4 w-4" />
        Send Notetaker
      </>
    );
  };

  const getButtonVariant = () => {
    if (mutation.isSuccess) return "outline";
    if (mutation.isError) return "destructive";
    return "default";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={getButtonVariant()}
          size="sm" 
          className="gap-2"
          disabled={mutation.isSuccess}
        >
          {getButtonContent()}
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