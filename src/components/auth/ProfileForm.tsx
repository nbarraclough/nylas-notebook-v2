import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

interface ProfileFormProps {
  session: any;
  onComplete: () => void;
}

export function ProfileForm({ session, onComplete }: ProfileFormProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [notetakerName, setNotetakerName] = useState(`${firstName}'s Notetaker`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!session || !firstName || !lastName) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in your first and last name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          job_title: jobTitle,
          notetaker_name: notetakerName || `${firstName}'s Notetaker`,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });

      onComplete();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setNotetakerName(`${e.target.value}'s Notetaker`);
                }}
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

          <div className="space-y-2">
            <Label htmlFor="notetaker-name">Notetaker Name</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Zap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="notetaker-name"
                  className="pl-9"
                  placeholder="Enter name for your Notetaker"
                  value={notetakerName}
                  onChange={(e) => setNotetakerName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !firstName || !lastName}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}