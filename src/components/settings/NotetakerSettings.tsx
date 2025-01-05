import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const NotetakerSettings = ({ 
  userId, 
  notetakerName, 
  onNotetakerNameChange 
}: { 
  userId: string;
  notetakerName: string;
  onNotetakerNameChange: (name: string) => void;
}) => {
  const { toast } = useToast();
  const [name, setName] = useState(notetakerName); // Now initialized with the prop value

  const updateNotetakerName = useMutation({
    mutationFn: async (newName: string) => {
      if (!userId) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update({ notetaker_name: newName })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      onNotetakerNameChange(name);
      toast({
        title: "Success",
        description: "Notetaker name updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating notetaker name:', error);
      toast({
        title: "Error",
        description: "Failed to update notetaker name. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveNotetakerName = () => {
    updateNotetakerName.mutate(name);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notetaker Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="notetaker-name">Notetaker Name</Label>
            <Input 
              id="notetaker-name" 
              placeholder="Enter name for your Notetaker" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSaveNotetakerName}
            disabled={updateNotetakerName.isPending}
          >
            Save Name
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};