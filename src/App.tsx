import { createBrowserRouter } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Queue from "./pages/Queue";
import Recordings from "./pages/Recordings";
import Settings from "./pages/Settings";
import Library from "./pages/Library";
import { SharedVideoView } from "./components/shared/SharedVideoView";
import Shared from "./pages/Shared";
import RecurringEvents from "./pages/RecurringEvents";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NylasAuthGuard } from "./components/auth/NylasAuthGuard";

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show nothing while checking auth state
  if (isAuthenticated === null) {
    return null;
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <NylasAuthGuard>{children}</NylasAuthGuard>;
};

// Define the router with all routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><Index /></ProtectedRoute>,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/calendar",
    element: <ProtectedRoute><Calendar /></ProtectedRoute>,
  },
  {
    path: "/queue",
    element: <ProtectedRoute><Queue /></ProtectedRoute>,
  },
  {
    path: "/recordings",
    element: <ProtectedRoute><Recordings /></ProtectedRoute>,
  },
  {
    path: "/settings/*",
    element: <ProtectedRoute><Settings /></ProtectedRoute>,
  },
  {
    path: "/library",
    element: <ProtectedRoute><Library /></ProtectedRoute>,
  },
  {
    path: "/library/:recordingId",
    element: <ProtectedRoute><Library /></ProtectedRoute>,
  },
  {
    path: "/shared",
    element: <ProtectedRoute><Shared /></ProtectedRoute>,
  },
  {
    path: "/shared/:token",
    element: <SharedVideoView />,
  },
  {
    path: "/recurring-events",
    element: <ProtectedRoute><RecurringEvents /></ProtectedRoute>,
  },
]);

export default router;