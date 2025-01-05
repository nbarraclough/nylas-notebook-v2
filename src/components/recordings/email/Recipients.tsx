import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Recipient {
  name: string;
  email: string;
}

interface RecipientsProps {
  recipients: Recipient[];
  newEmail: string;
  onNewEmailChange: (email: string) => void;
  onAddRecipient: () => void;
  onRemoveRecipient: (email: string) => void;
}

export function Recipients({
  recipients,
  newEmail,
  onNewEmailChange,
  onAddRecipient,
  onRemoveRecipient,
}: RecipientsProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Recipients</label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted min-h-[60px] max-h-[120px] overflow-y-auto">
        {recipients.map((recipient) => (
          <div 
            key={recipient.email}
            className="flex items-center gap-2 bg-background px-3 py-1 rounded-full border"
          >
            <span className="text-sm">{recipient.email}</span>
            <button
              onClick={() => onRemoveRecipient(recipient.email)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Input
          placeholder="Email address"
          type="email"
          value={newEmail}
          onChange={(e) => onNewEmailChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddRecipient();
            }
          }}
          className="flex-1"
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={onAddRecipient}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}