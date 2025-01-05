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
import { useQuery } from "@tanstack/react-query";

export function Navbar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fetch the most recent shared video for the current user
  const { data: recentShare } = useQuery({
    queryKey: ['recent-share'],
    queryFn: async () => {
      const { data: share, error } = await supabase
        .from('video_shares')
        .select('external_token')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return share;
    },
    enabled: isLoggedIn,
  });

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

  const handleSharedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recentShare?.external_token) {
      navigate(`/shared/${recentShare.external_token}`);
    } else {
      toast({
        title: "No shared videos",
        description: "You haven't shared any videos yet.",
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
              <a
                href="#"
                onClick={handleSharedClick}
                className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Shared
              </a>
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