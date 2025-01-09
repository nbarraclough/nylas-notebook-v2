import { Link } from "react-router-dom";
import { SendNotetaker } from "../notetaker/SendNotetaker";
import { Button } from "../ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { 
  Calendar, 
  Settings, 
  Menu,
  Repeat,
  Book,
  Home,
  LogOut,
  NotebookPen,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { clearAuthStorage } from "@/utils/authStorage";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      
      // If session expired or user signed out, redirect to auth page
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple logout attempts
    
    setIsLoggingOut(true);
    try {
      // First clear local storage and session storage
      await clearAuthStorage();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Logout error:', error);
        // Even if there's an error, we'll show success since local storage is cleared
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        });
      } else {
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account.",
        });
      }
      
      // Set logged out state and redirect
      setIsLoggedIn(false);
      navigate("/auth");
      
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logged out with warnings",
        description: "You have been logged out, but there were some warnings. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const NavLinks = ({ className, onClick }: { className?: string; onClick?: () => void }) => (
    <div className={cn("flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6", className)}>
      <Link
        to="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 rounded-md px-3 py-2",
          location.pathname === "/" ? "border border-primary bg-transparent" : "hover:bg-accent"
        )}
        onClick={onClick}
      >
        <Home className="h-4 w-4" />
        Dashboard
      </Link>
      <Link
        to="/calendar"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 rounded-md px-3 py-2",
          location.pathname === "/calendar" ? "border border-primary bg-transparent" : "hover:bg-accent"
        )}
        onClick={onClick}
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </Link>
      <Link
        to="/recurring-events"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 rounded-md px-3 py-2",
          location.pathname === "/recurring-events" ? "border border-primary bg-transparent" : "hover:bg-accent"
        )}
        onClick={onClick}
      >
        <Repeat className="h-4 w-4" />
        Recurring Events
      </Link>
      <Link
        to="/library"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 rounded-md px-3 py-2",
          location.pathname === "/library" ? "border border-primary bg-transparent" : "hover:bg-accent"
        )}
        onClick={onClick}
      >
        <Book className="h-4 w-4" />
        Library
      </Link>
      <div className="lg:hidden">
        <SendNotetaker />
      </div>
    </div>
  );

  return (
    <nav className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
      <div className="flex h-16 items-center px-4 justify-between">
        <div className="flex items-center">
          <div className="mr-6 flex items-center space-x-2">
            <NotebookPen className="h-5 w-5" />
            <span className="font-bold text-lg">
              Notebook
            </span>
          </div>
          
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
                      <div className="flex items-center space-x-2 mb-6">
                        <NotebookPen className="h-5 w-5" />
                        <span className="font-bold text-lg">Notebook</span>
                      </div>
                      <NavLinks onClick={() => setIsOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="hidden lg:block">
            {isLoggedIn && <SendNotetaker />}
          </div>
          {isLoggedIn && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className={cn(
                  location.pathname.startsWith("/settings") && "border border-primary bg-transparent"
                )}
              >
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}