import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationInfoProps {
  name: string;
  domain: string;
  userRole: string;
  organizationId: string;
  onOrganizationUpdate: () => void;
}

export const OrganizationInfo = ({ 
  name, 
  domain, 
  userRole,
  organizationId,
  onOrganizationUpdate 
}: OrganizationInfoProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isAdmin = userRole === 'admin';

  const handleSubmit = async () => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Organization name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Updating organization name:', {
        organizationId,
        newName: newName.trim(),
        userRole
      });

      const { data, error } = await supabase
        .from('organizations')
        .update({ 
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)
        .select();

      if (error) {
        console.error('Error updating organization:', error);
        throw error;
      }

      console.log('Organization updated successfully:', data);

      toast({
        title: "Success",
        description: "Organization name updated successfully",
      });
      
      onOrganizationUpdate();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update organization name",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label>Organization Name</Label>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-sm"
                placeholder="Enter organization name"
              />
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                size="sm"
              >
                Save
              </Button>
              <Button 
                onClick={() => {
                  setIsEditing(false);
                  setNewName(name);
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{name}</p>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div>
        <Label>Domain</Label>
        <p className="text-sm text-muted-foreground">{domain}</p>
      </div>
      <div>
        <Label>Role</Label>
        <p className="text-sm text-muted-foreground">
          {userRole === 'admin' ? 'Admin' : 'Member'}
        </p>
      </div>
    </div>
  );
};