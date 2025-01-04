import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateJoinOrganizationProps {
  userId: string;
  onOrganizationUpdate: () => Promise<void>;
}

export const CreateJoinOrganization = ({ userId, onOrganizationUpdate }: CreateJoinOrganizationProps) => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");

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

      await onOrganizationUpdate();
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create organization. Please try again.",
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

      await onOrganizationUpdate();
      toast({
        title: "Success",
        description: "Successfully joined organization!",
      });
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join organization. Please check the domain and try again.",
        variant: "destructive",
      });
    }
  };

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