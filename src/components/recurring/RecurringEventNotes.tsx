import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RecurringEventNotesProps {
  masterId: string;
  initialContent: string;
  onSave: (masterId: string, content: string) => Promise<void>;
}

export function RecurringEventNotes({ masterId, initialContent, onSave }: RecurringEventNotesProps) {
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      },
    },
  });

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      await onSave(masterId, editor.getHTML());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Notes</h4>
      <EditorContent editor={editor} />
      <Button 
        onClick={handleSave}
        disabled={isSaving}
        className="text-white"
      >
        {isSaving ? 'Saving...' : 'Save Notes'}
      </Button>
    </div>
  );
}