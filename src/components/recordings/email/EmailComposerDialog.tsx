import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  grantId,
  recordingId
}: EmailComposerDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [subject, setSubject] = useState(`${eventTitle} - my Notetaker recording`);
  const [body, setBody] = useState(
    `Hi everyone,\n\nI wanted to share the recording from our meeting "${eventTitle}".\n\nYou can watch it here: ${shareUrl}\n\nBest regards`
  );
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const handleAddRecipient = () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Check if email already exists
    if (recipients.some(r => r.email === newEmail)) {
      toast({
        title: "Error",
        description: "This email address is already in the recipients list.",
        variant: "destructive",
      });
      return;
    }

    setRecipients([...recipients, { 
      name: newName || newEmail.split('@')[0], 
      email: newEmail 
    }]);
    setNewEmail("");
    setNewName("");
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    if (!grantId) {
      toast({
        title: "Error",
        description: "Nylas connection not found. Please connect your calendar first.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-recording-email', {
        body: {
          grantId,
          subject,
          body,
          recipients,
          recordingId,
        },
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      console.log('Email sent successfully:', data);
      toast({
        title: "Email sent",
        description: "The recording has been shared with all recipients.",
      });
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
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
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipients</label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted min-h-[100px]">
              {recipients.map((recipient) => (
                <div 
                  key={recipient.email}
                  className="flex items-center gap-2 bg-background px-3 py-1 rounded-full border"
                >
                  <span className="text-sm">
                    {recipient.name} ({recipient.email})
                  </span>
                  <button
                    onClick={() => handleRemoveRecipient(recipient.email)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <Input
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mb-2"
                />
                <Input
                  placeholder="Email address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddRecipient}
                className="h-auto"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message"
              rows={8}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || recipients.length === 0}
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