import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface JoinOrganizationProps {
  userId: string;
  onOrganizationUpdate: () => Promise<void>;
}

export const JoinOrganization = ({ userId, onOrganizationUpdate }: JoinOrganizationProps) => {
  const { toast } = useToast();
  const [joinDomain, setJoinDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinOrg = async () => {
    try {
      setIsLoading(true);
      
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select()
        .eq('domain', joinDomain)
        .single();

      if (orgError) throw orgError;
      if (!org) throw new Error('Organization not found');

      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: org.id,
          user_id: userId,
          role: 'user'
        }]);

      if (memberError) throw memberError;

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="join-domain">Join Organization by Domain</Label>
        <Input
          id="join-domain"
          value={joinDomain}
          onChange={(e) => setJoinDomain(e.target.value)}
          placeholder="e.g., company.com"
          disabled={isLoading}
        />
      </div>
      <Button 
        onClick={handleJoinOrg}
        disabled={!joinDomain || isLoading}
        variant="outline"
      >
        {isLoading ? "Joining..." : "Join Organization"}
      </Button>
    </div>
  );
};