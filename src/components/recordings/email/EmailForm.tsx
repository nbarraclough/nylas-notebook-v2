import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

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
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          job_title,
          organization_id,
          organizations (
            name
          )
        `)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return profile;
    },
  });

  useEffect(() => {
    if (profile && body === '') {
      const signature = [
        '',
        'Best regards,',
        '',
        profile.first_name ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}` : '',
        profile.job_title || '',
        profile.organizations?.name || '',
      ].filter(Boolean).join('\n');

      const defaultTemplate = [
        'Hi everyone,',
        '',
        'I wanted to share the recording from our meeting "Manual Meeting".',
        '',
        'You can watch it here: {RECORDING_LINK}',
        signature
      ].join('\n');

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
      </div>
    </>
  );
}