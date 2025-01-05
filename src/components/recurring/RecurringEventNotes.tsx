import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RecurringEventNotesProps {
  masterId: string;
  initialContent: string;
  onSave: (masterId: string, content: string) => Promise<void>;
}

export function RecurringEventNotes({ masterId, initialContent, onSave }: RecurringEventNotesProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(masterId, content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Notes</h4>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add notes about this recurring event..."
        className="min-h-[200px]"
      />
      <Button 
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Notes'}
      </Button>
    </div>
  );
}