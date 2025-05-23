
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Library from "./pages/Library";
import Shared from "./pages/Shared";
import { AuthGuard } from "./components/auth/AuthGuard";
import { NylasAuthGuard } from "./components/auth/NylasAuthGuard";
import Recordings from "./pages/Recordings";
import RecurringEvents from "./pages/RecurringEvents";
import RecurringEventSeries from "./pages/RecurringEventSeries";
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/shared/:token" element={<Shared />} />
      <Route element={<AuthGuard><Outlet /></AuthGuard>}>
        <Route element={<NylasAuthGuard><Outlet /></NylasAuthGuard>}>
          <Route path="/calendar" element={<Calendar />} />
        </Route>
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/library" element={<Library />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/recurring-events" element={<RecurringEvents />} />
        <Route path="/recurring-event-series/:masterId" element={<RecurringEventSeries />} />
      </Route>
    </Routes>
  );
}
