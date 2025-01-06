import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { useProfileData } from "@/components/library/video/useProfileData";

interface EmailFormProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
  shareUrl: string;
}

export function EmailForm({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  shareUrl,
}: EmailFormProps) {
  const { data: profile } = useProfileData();

  useEffect(() => {
    if (profile && body === '') {
      console.log('Constructing email template with profile:', profile);
      
      // Construct name part
      const fullName = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ');
      
      // Construct organization part
      const organizationName = profile.organizations?.name || '';
      
      // Construct signature parts, filtering out empty values
      const signatureParts = [
        '',
        'Best regards,',
        '',
        fullName || 'Me',
        profile.job_title || '',
        organizationName
      ].filter(Boolean);

      // Join signature parts with newlines
      const signature = signatureParts.join('\n');

      const defaultTemplate = [
        'Hi everyone,',
        '',
        'I wanted to share the recording from our meeting.',
        '',
        'You can watch it here: {RECORDING_LINK}',
        signature
      ].join('\n');

      console.log('Setting email template with signature:', defaultTemplate);
      onBodyChange(defaultTemplate);
    }
  }, [profile, body, onBodyChange]);

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
        <p className="text-sm text-muted-foreground">
          Use {'{RECORDING_LINK}'} to insert the recording link in your message.
        </p>
      </div>
    </>
  );
}