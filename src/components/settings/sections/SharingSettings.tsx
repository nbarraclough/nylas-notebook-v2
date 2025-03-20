
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface SharingSettingsProps {
  userId: string;
}

export function SharingSettings({ userId }: SharingSettingsProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sharing Rules</h2>
      <Card>
        <CardHeader>
          <CardTitle>Sharing Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configure your sharing settings in individual recordings by using the share button.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
