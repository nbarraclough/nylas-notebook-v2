import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Queue from "./pages/Queue";
import Settings from "./pages/Settings";
import Recordings from "./pages/Recordings";
import Library from "./pages/Library";
import { SharedVideoView } from "./components/shared/SharedVideoView";
import Shared from "./pages/Shared";
import RecurringEvents from "./pages/RecurringEvents";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NylasAuthGuard } from "./components/auth/NylasAuthGuard";
import { Toaster } from "@/components/ui/toaster";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" />;
  }

  return <NylasAuthGuard>{children}</NylasAuthGuard>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Calendar />
      </ProtectedRoute>
    ),
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/calendar",
    element: (
      <ProtectedRoute>
        <Calendar />
      </ProtectedRoute>
    ),
  },
  {
    path: "/queue",
    element: (
      <ProtectedRoute>
        <Queue />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/recordings",
    element: (
      <ProtectedRoute>
        <Recordings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/library",
    element: (
      <ProtectedRoute>
        <Library />
      </ProtectedRoute>
    ),
  },
  {
    path: "/shared",
    element: <Shared />,
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

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;