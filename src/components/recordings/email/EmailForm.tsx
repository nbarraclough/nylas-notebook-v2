import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EmailFormProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
}

export function EmailForm({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
}: EmailFormProps) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Subject</label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Enter email subject"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message</label>
        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Enter your message"
          rows={8}
        />
      </div>
    </>
  );
}