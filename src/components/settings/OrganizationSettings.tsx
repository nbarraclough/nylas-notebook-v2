import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { UserPlus, Shield, UserMinus } from "lucide-react";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");

  // Fetch user's organization details including members
  const { data: organizationData, refetch: refetchOrg } = useQuery({
    queryKey: ['organization', userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (!profile?.organization_id) return null;

      const { data: org } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members!inner(
            user_id,
            role,
            profiles(
              email
            )
          )
        `)
        .eq('id', profile.organization_id)
        .single();

      return org;
    },
    enabled: !!userId,
  });

  const isAdmin = organizationData?.organization_members?.some(
    member => member.user_id === userId && member.role === 'admin'
  );

  const handleCreateOrg = async () => {
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName, domain: orgDomain }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as admin
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: org.id,
          user_id: userId,
          role: 'admin'
        }]);

      if (memberError) throw memberError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      await refetchOrg();
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleJoinOrg = async () => {
    try {
      // Find organization by domain
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select()
        .eq('domain', orgDomain)
        .single();

      if (orgError) throw orgError;

      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: org.id,
          user_id: userId,
          role: 'user'
        }]);

      if (memberError) throw memberError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      await refetchOrg();
      toast({
        title: "Success",
        description: "Successfully joined organization!",
      });
    } catch (error) {
      console.error('Error joining organization:', error);
      toast({
        title: "Error",
        description: "Failed to join organization. Please check the domain and try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async () => {
    try {
      // First get the user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (profileError) throw new Error('User not found');

      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: organizationData.id,
          user_id: userProfile.id,
          role: 'user'
        }]);

      if (memberError) throw memberError;

      // Update user's profile with organization
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ organization_id: organizationData.id })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      await refetchOrg();
      setNewUserEmail('');
      toast({
        title: "Success",
        description: "User added successfully!",
      });
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: "Failed to add user. Please check the email and try again.",
        variant: "destructive",
      });
    }
  };

  const handlePromoteUser = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: 'admin' })
        .eq('user_id', memberId)
        .eq('organization_id', organizationData.id);

      if (error) throw error;

      await refetchOrg();
      toast({
        title: "Success",
        description: "User promoted to admin successfully!",
      });
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: "Error",
        description: "Failed to promote user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (memberId: string) => {
    try {
      // Remove from organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', memberId)
        .eq('organization_id', organizationData.id);

      if (memberError) throw memberError;

      // Update user's profile to remove organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', memberId);

      if (profileError) throw profileError;

      await refetchOrg();
      toast({
        title: "Success",
        description: "User removed successfully!",
      });
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (organizationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <Label>Organization Name</Label>
              <p className="text-sm text-muted-foreground">{organizationData.name}</p>
            </div>
            <div>
              <Label>Domain</Label>
              <p className="text-sm text-muted-foreground">{organizationData.domain}</p>
            </div>
            <div>
              <Label>Role</Label>
              <p className="text-sm text-muted-foreground">
                {organizationData.organization_members.find(m => m.user_id === userId)?.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-4">
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
                <Button onClick={handleAddUser} disabled={!newUserEmail}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>

              <div>
                <Label>Members</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizationData.organization_members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>{member.profiles.email}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {member.role !== 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteUser(member.user_id)}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            {member.user_id !== userId && (
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
                                      onClick={() => handleRemoveUser(member.user_id)}
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join or Create Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
            />
          </div>
          <div>
            <Label htmlFor="org-domain">Domain</Label>
            <Input
              id="org-domain"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              placeholder="e.g., company.com"
            />
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={handleCreateOrg}
              disabled={!orgName || !orgDomain}
            >
              Create Organization
            </Button>
            <Button 
              onClick={handleJoinOrg}
              disabled={!orgDomain}
              variant="outline"
            >
              Join Organization
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};