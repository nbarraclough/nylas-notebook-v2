import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { NylasAuthGuard } from "./components/auth/NylasAuthGuard";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Recordings from "./pages/Recordings";
import Settings from "./pages/Settings";
import Shared from "./pages/Shared";
import RecurringEvents from "./pages/RecurringEvents";
import RecurringEventSeries from "./pages/RecurringEventSeries";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/shared/:token" element={<Shared />} />
        <AuthGuard>
          <NylasAuthGuard>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:recordingId" element={<Library />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/recurring-events" element={<RecurringEvents />} />
            <Route path="/recurring-events/:masterId" element={<RecurringEventSeries />} />
          </NylasAuthGuard>
        </AuthGuard>
      </Routes>
    </Router>
  );
}

export default App;