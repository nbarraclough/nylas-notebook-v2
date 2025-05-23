
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Bold, 
  Italic, 
  List, 
  Heading,
  Code
} from 'lucide-react';

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
        class: 'min-h-[200px] w-full outline-none prose prose-sm max-w-none px-4 py-3',
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

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium">Notes</h4>
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
        <div className="border-b bg-muted/50 p-2 flex gap-1.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 px-2.5 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 px-2.5 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 px-2.5 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`h-8 px-2.5 ${editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}`}
          >
            <Heading className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`h-8 px-2.5 ${editor.isActive('codeBlock') ? 'bg-muted' : ''}`}
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
        <div 
          className="min-h-[200px] w-full cursor-text bg-white ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          onClick={() => editor.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="text-white"
        >
          {isSaving ? 'Saving...' : 'Save Notes'}
        </Button>
      </div>
    </div>
  );
}
