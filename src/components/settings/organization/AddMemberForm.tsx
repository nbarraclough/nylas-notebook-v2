import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddMemberFormProps {
  onAddMember: (email: string) => Promise<void>;
}

export const AddMemberForm = ({ onAddMember }: AddMemberFormProps) => {
  const [newUserEmail, setNewUserEmail] = useState("");

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor="new-user">Add User</Label>
        <Input
          id="new-user"
          type="email"
          placeholder="user@example.com"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
      </div>
      <Button 
        onClick={() => {
          onAddMember(newUserEmail);
          setNewUserEmail("");
        }} 
        disabled={!newUserEmail}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Add User
      </Button>
    </div>
  );
};