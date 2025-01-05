import { Link } from "react-router-dom";
import { SendNotetaker } from "../notetaker/SendNotetaker";
import { Button } from "../ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { 
  Calendar, 
  Settings, 
  Library,
  LogOut,
  Menu,
  LayoutDashboard,
  Repeat,
  Home,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
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
        to="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 border-b-2 border-transparent hover:border-primary pb-1",
          location.pathname === "/" && "text-primary border-primary"
        )}
        onClick={onClick}
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>
      <Link
        to="/calendar"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 border-b-2 border-transparent hover:border-primary pb-1",
          location.pathname === "/calendar" && "text-primary border-primary"
        )}
        onClick={onClick}
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </Link>
      <Link
        to="/recurring-events"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 border-b-2 border-transparent hover:border-primary pb-1",
          location.pathname === "/recurring-events" && "text-primary border-primary"
        )}
        onClick={onClick}
      >
        <Repeat className="h-4 w-4" />
        Recurring Events
      </Link>
      <Link
        to="/library"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary inline-flex items-center gap-2 border-b-2 border-transparent hover:border-primary pb-1",
          location.pathname === "/library" && "text-primary border-primary"
        )}
        onClick={onClick}
      >
        <Library className="h-4 w-4" />
        Library
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
          <div className="mr-6 flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span className="font-bold">
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
                        <Home className="h-5 w-5" />
                        <span className="font-bold">Notebook</span>
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
                  location.pathname.startsWith("/settings") && "text-primary border-primary"
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
