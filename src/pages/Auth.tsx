import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Auth() {
  return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Sign in to Notebook</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg">
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}