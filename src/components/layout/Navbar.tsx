import { Link } from "react-router-dom";
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
  Home,
  Menu,
  Library,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Navbar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  const NavLinks = ({ className, onClick }: { className?: string; onClick?: () => void }) => (
    <div className={cn("flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6", className)}>
      <Link
        to="/calendar"
        className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
        onClick={onClick}
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </Link>
      <Link
        to="/queue"
        className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
        onClick={onClick}
      >
        <ListTodo className="h-4 w-4" />
        Queue
      </Link>
      <Link
        to="/recordings"
        className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
        onClick={onClick}
      >
        <Video className="h-4 w-4" />
        Recordings
      </Link>
      <Link
        to="/library"
        className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
        onClick={onClick}
      >
        <Library className="h-4 w-4" />
        Library
      </Link>
      <Link
        to="/shared"
        className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
        onClick={onClick}
      >
        <Share2 className="h-4 w-4" />
        Shared
      </Link>
      <Link
        to="/settings"
        className="text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2"
        onClick={onClick}
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link>
      <div className="lg:hidden">
        <SendNotetaker />
      </div>
    </div>
  );

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 justify-between">
        <div className="flex items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span className="font-bold">
              Notebook
            </span>
          </Link>
          
          {isLoggedIn && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden lg:block">
                <NavLinks />
              </div>
              
              {/* Mobile Navigation */}
              <div className="lg:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                    <div className="flex flex-col h-full">
                      <Link to="/" className="flex items-center space-x-2 mb-6" onClick={() => setIsOpen(false)}>
                        <Home className="h-5 w-5" />
                        <span className="font-bold">Notebook</span>
                      </Link>
                      <NavLinks onClick={() => setIsOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden lg:block">
            {isLoggedIn && <SendNotetaker />}
          </div>
          {isLoggedIn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}