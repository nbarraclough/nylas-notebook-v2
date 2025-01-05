import { Link, useNavigate } from "react-router-dom";
import { SendNotetaker } from "../notetaker/SendNotetaker";
import { Button } from "../ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { 
  LogOut, 
  Calendar, 
  Settings, 
  Share2, 
  ListTodo, 
  Video,
  Home 
} from "lucide-react";
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
            <Home className="h-5 w-5" />
            <span className="hidden font-bold sm:inline-block">
              Notebook
            </span>
          </Link>
          {isLoggedIn && (
            <div className="flex items-center space-x-4 lg:space-x-6">
              <Link
                to="/calendar"
                className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Link>
              <Link
                to="/queue"
                className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
              >
                <ListTodo className="h-4 w-4" />
                Queue
              </Link>
              <Link
                to="/recordings"
                className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                Recordings
              </Link>
              <Link
                to="/shared"
                className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Shared
              </Link>
              <Link
                to="/settings"
                className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
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