import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { NylasAuthGuard } from "@/components/auth/NylasAuthGuard";
import { LoadingScreen } from "@/components/LoadingScreen";

// Pages
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Calendar from "@/pages/Calendar";
import Library from "@/pages/Library";
import Video from "@/pages/Video";
import Queue from "@/pages/Queue";
import Settings from "@/pages/Settings";
import Shared from "@/pages/Shared";
import RecurringEvents from "@/pages/RecurringEvents";
import RecurringEventSeries from "@/pages/RecurringEventSeries";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/shared/:token" element={<Shared />} />
          <Route element={<AuthGuard><LoadingScreen /></AuthGuard>}>
            <Route path="/calendar" element={<NylasAuthGuard><Calendar /></NylasAuthGuard>} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:recordingId" element={<Video />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/recurring" element={<RecurringEvents />} />
            <Route path="/recurring/:masterId" element={<RecurringEventSeries />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;