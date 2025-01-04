import { UserPlus, Shield, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Member {
  user_id: string;
  role: string;
  profiles: {
    email: string;
  };
}

interface MembersListProps {
  members: Member[];
  currentUserId: string;
  onPromoteUser: (userId: string) => Promise<void>;
  onRemoveUser: (userId: string) => Promise<void>;
}

export const MembersList = ({ 
  members, 
  currentUserId, 
  onPromoteUser, 
  onRemoveUser 
}: MembersListProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.user_id}>
            <TableCell>{member.profiles.email}</TableCell>
            <TableCell>{member.role}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {member.role !== 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPromoteUser(member.user_id)}
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                )}
                {member.user_id !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove this user from the organization?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onRemoveUser(member.user_id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};