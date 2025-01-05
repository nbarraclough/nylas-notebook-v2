import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "lucide-react";

interface NotetakerPopoverContentProps {
  meetingInfo: string;
  setMeetingInfo: (value: string) => void;
  handleClear: () => void;
  handleSend: () => void;
  isPending: boolean;
}

export function NotetakerPopoverContent({
  meetingInfo,
  setMeetingInfo,
  handleClear,
  handleSend,
  isPending,
}: NotetakerPopoverContentProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium leading-none">Send Notetaker to Meeting</h4>
      <Textarea
        placeholder="Paste meeting URL or joining information"
        value={meetingInfo}
        onChange={(e) => setMeetingInfo(e.target.value)}
        className="min-h-[100px]"
        disabled={isPending}
      />
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={isPending}
        >
          Clear
        </Button>
        <Button
          onClick={handleSend}
          disabled={!meetingInfo.trim() || isPending}
        >
          {isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send'
          )}
        </Button>
      </div>
    </div>
  );
}