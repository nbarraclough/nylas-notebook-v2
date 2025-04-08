
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink } from "@/components/ui/external-link";

export function DeprecationBanner() {
  return (
    <Alert variant="destructive" className="border-red-500 bg-red-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        Notebook v2 is now deprecated - thank you for all of your testing! Please use Notebook v3 on{" "}
        <ExternalLink href="https://notebook.nylas.ai/" className="font-medium underline">
          https://notebook.nylas.ai/
        </ExternalLink>{" "}
        for all future testing!
      </AlertDescription>
    </Alert>
  );
}
