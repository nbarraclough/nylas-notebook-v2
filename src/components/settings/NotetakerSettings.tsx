import { useState, useEffect } from "react";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  // Query to fetch the profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notetaker_name, first_name, last_name, job_title')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update local state when profile data is fetched
  useEffect(() => {
    if (profile) {
      if (profile.notetaker_name) {
        setName(profile.notetaker_name);
        onNotetakerNameChange(profile.notetaker_name);
      }
      if (profile.first_name) setFirstName(profile.first_name);
      if (profile.last_name) setLastName(profile.last_name);
      if (profile.job_title) setJobTitle(profile.job_title);
    }
  }, [profile, onNotetakerNameChange]);

  const updateProfile = useMutation({
    mutationFn: async ({ notetakerName, firstName, lastName, jobTitle }: { 
      notetakerName: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
    }) => {
      if (!userId) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          notetaker_name: notetakerName,
          first_name: firstName,
          last_name: lastName,
          job_title: jobTitle
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      onNotetakerNameChange(name);
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfile.mutate({ 
      notetakerName: name,
      firstName,
      lastName,
      jobTitle
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name</Label>
          <Input 
            id="first-name" 
            placeholder="Enter your first name" 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name</Label>
          <Input 
            id="last-name" 
            placeholder="Enter your last name" 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-title">Job Title</Label>
        <Input 
          id="job-title" 
          placeholder="Enter your job title" 
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
      </div>
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
          onClick={handleSaveProfile}
          disabled={updateProfile.isPending}
        >
          Save Profile
        </Button>
      </div>
    </div>
  );
};