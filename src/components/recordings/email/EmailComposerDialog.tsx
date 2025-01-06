import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Recipients } from "./Recipients";
import { EmailForm } from "./EmailForm";
import { useProfileData } from "@/components/library/video/useProfileData";

interface Recipient {
  name: string;
  email: string;
}

interface EmailComposerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  recipients: Recipient[];
  shareUrl: string;
  grantId: string | null;
  recordingId: string;
}

export function EmailComposerDialog({
  isOpen,
  onClose,
  eventTitle,
  recipients: initialRecipients,
  shareUrl,
  recordingId
}: EmailComposerDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [subject, setSubject] = useState(`${eventTitle} - Recording`);
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [newEmail, setNewEmail] = useState("");
  
  // Use the useProfileData hook to get the user's Nylas grant ID
  const { data: profile, isLoading: profileLoading } = useProfileData();

  const handleAddRecipient = () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (recipients.some(r => r.email === newEmail)) {
      toast({
        title: "Error",
        description: "This email address is already in the recipients list.",
        variant: "destructive",
      });
      return;
    }

    setRecipients([...recipients, { 
      name: newEmail.split('@')[0], 
      email: newEmail 
    }]);
    setNewEmail("");
  };

  const handleSend = async () => {
    console.log('Send button clicked');
    
    if (recipients.length === 0) {
      console.log('No recipients added');
      toast({
        title: "Error",
        description: "Please add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.nylas_grant_id) {
      console.log('No Nylas grant ID found in profile:', profile);
      toast({
        title: "Error",
        description: "Nylas connection not found. Please connect your calendar first.",
        variant: "destructive",
      });
      return;
    }

    if (!shareUrl) {
      console.log('No share URL found');
      toast({
        title: "Error",
        description: "Share URL not found. Please generate a share link first.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const emailBody = body.replace('{RECORDING_LINK}', shareUrl);
      console.log('Preparing email request:', {
        grantId: profile.nylas_grant_id,
        subject,
        body: emailBody,
        recipients,
        recordingId,
      });

      const { data, error } = await supabase.functions.invoke('send-recording-email', {
        body: {
          grantId: profile.nylas_grant_id,
          subject,
          body: emailBody,
          recipients,
          recordingId,
        },
      });

      console.log('Email response:', { data, error });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      toast({
        title: "Email sent",
        description: "The recording has been shared with all recipients.",
      });
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error sending email",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Recording via Email</DialogTitle>
          <DialogDescription>
            Send this recording to participants or other team members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Recipients
            recipients={recipients}
            newEmail={newEmail}
            onNewEmailChange={setNewEmail}
            onAddRecipient={handleAddRecipient}
            onRemoveRecipient={(email) => setRecipients(recipients.filter(r => r.email !== email))}
          />
          
          <EmailForm
            subject={subject}
            onSubjectChange={setSubject}
            body={body}
            onBodyChange={setBody}
            shareUrl={shareUrl}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || recipients.length === 0 || profileLoading}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Email'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}