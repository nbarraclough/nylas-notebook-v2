import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Calendar() {
  const navigate = useNavigate();
  const isNylasAuthenticated = false;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!isNylasAuthenticated) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>Connect Your Calendar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Connect your calendar to start recording meetings with Notebook.
              </p>
              <Button size="lg">Connect with Nylas</Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Your Calendar</h1>
        <div className="grid gap-4">
          {/* Calendar events will go here */}
        </div>
      </div>
    </PageLayout>
  );
}