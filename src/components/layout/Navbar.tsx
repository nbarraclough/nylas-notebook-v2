import { Link, useNavigate } from "react-router-dom";
import { SendNotetaker } from "../notetaker/SendNotetaker";
import { Button } from "../ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 justify-between">
        <div className="flex items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Notebook
            </span>
          </Link>
          {isLoggedIn && (
            <div className="flex items-center space-x-4 lg:space-x-6">
              <Link
                to="/calendar"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Calendar
              </Link>
              <Link
                to="/queue"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Queue
              </Link>
              <Link
                to="/recordings"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Recordings
              </Link>
              <Link
                to="/settings"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Settings
              </Link>
              <SendNotetaker />
            </div>
          )}
        </div>
        {isLoggedIn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </nav>
  );
}