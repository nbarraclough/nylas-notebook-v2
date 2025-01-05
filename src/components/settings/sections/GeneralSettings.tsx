import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotetakerSettings } from "@/components/settings/NotetakerSettings";

interface GeneralSettingsProps {
  userId: string;
}

export function GeneralSettings({ userId }: GeneralSettingsProps) {
  const [notetakerName, setNotetakerName] = useState("");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">General Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle>Notetaker Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <NotetakerSettings 
            userId={userId}
            notetakerName={notetakerName}
            onNotetakerNameChange={setNotetakerName}
          />
        </CardContent>
      </Card>
    </div>
  );
}