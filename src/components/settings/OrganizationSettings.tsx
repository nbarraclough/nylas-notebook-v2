import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");

  // Fetch user's organization details
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
        .select('*, organization_members!inner(*)')
        .eq('id', profile.organization_id)
        .single();

      return org;
    },
    enabled: !!userId,
  });

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

  if (organizationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
              {organizationData.organization_members[0].role === 'admin' ? 'Admin' : 'Member'}
            </p>
          </div>
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