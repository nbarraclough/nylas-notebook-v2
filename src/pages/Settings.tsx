import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Notetaker Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notetaker-name">Notetaker Name</Label>
              <Input id="notetaker-name" placeholder="Enter name for your Notetaker" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recording Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Record External Meetings</Label>
                <p className="text-sm text-muted-foreground">
                  Record meetings where the host's email domain differs from participants
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Record Internal Meetings</Label>
                <p className="text-sm text-muted-foreground">
                  Record meetings where all participants share the same email domain
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}