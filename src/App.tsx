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
        {/* Public routes */}
        <Route path="/shared/:token" element={<Shared />} />
        <Route path="/auth" element={<Auth />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <Index />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/calendar"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <Calendar />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/library"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <Library />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/library/:recordingId"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <Library />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/recordings"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <Recordings />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/settings/*"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <Settings />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/recurring-events"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <RecurringEvents />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/recurring-events/:masterId"
          element={
            <AuthGuard>
              <NylasAuthGuard>
                <RecurringEventSeries />
              </NylasAuthGuard>
            </AuthGuard>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;