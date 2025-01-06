import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const [name, setName] = useState(notetakerName);

  // Query to fetch the notetaker name
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notetaker_name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update local state when profile data is fetched
  useEffect(() => {
    if (profile?.notetaker_name) {
      setName(profile.notetaker_name);
      onNotetakerNameChange(profile.notetaker_name);
    }
  }, [profile, onNotetakerNameChange]);

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
    <div className="space-y-4">
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
    </div>
  );
};