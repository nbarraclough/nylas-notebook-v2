import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

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
  const { toast } = useToast();
  const { redirectToAuth } = useAuthRedirect();

  const { data: profile, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      console.log('Fetching profile data for email form');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found');
        throw new Error('Authentication required');
      }

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

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile data fetched:', profile);
      return profile;
    },
    retry: false,
    onError: (error) => {
      console.error('Profile query error:', error);
      if (error.message === 'Authentication required') {
        redirectToAuth('Please sign in to send emails');
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile information. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  useEffect(() => {
    if (profile && body === '') {
      console.log('Constructing email template with profile:', profile);
      
      // Construct signature parts, filtering out any undefined/null values
      const signatureParts = [
        '',
        'Best regards,',
        '',
        profile.first_name && profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || '',
        profile.job_title || '',
        profile.organizations?.name || ''
      ].filter(Boolean); // Remove empty strings

      // Join signature parts with newlines
      const signature = signatureParts.join('\n');

      const defaultTemplate = [
        'Hi everyone,',
        '',
        'I wanted to share the recording from our meeting "Manual Meeting".',
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
      </div>
    </>
  );
}