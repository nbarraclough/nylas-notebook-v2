import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Marketing from "@/pages/Marketing";
import Auth from "@/pages/Auth";
import Calendar from "@/pages/Calendar";
import Library from "@/pages/Library";
import Queue from "@/pages/Queue";
import Recordings from "@/pages/Recordings";
import Settings from "@/pages/Settings";
import Index from "@/pages/Index";
import Shared from "@/pages/Shared";
import RecurringEvents from "@/pages/RecurringEvents";
import RecurringEventSeries from "@/pages/RecurringEventSeries";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Marketing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/shared/*" element={<Shared />} />
          <Route element={<AuthGuard>}>
            <Route path="/dashboard" element={<Index />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/library" element={<Library />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/recurring-events" element={<RecurringEvents />} />
            <Route path="/recurring-events/:masterEventId" element={<RecurringEventSeries />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;