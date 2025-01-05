import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Queue from "./pages/Queue";
import Recordings from "./pages/Recordings";
import Settings from "./pages/Settings";
import Shared from "./pages/Shared";
import RecurringEvents from "./pages/RecurringEvents";
import RecurringEventSeries from "./pages/RecurringEventSeries";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:recordingId" element={<Library />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/shared/:token" element={<Shared />} />
        <Route path="/recurring-events" element={<RecurringEvents />} />
        <Route path="/recurring-events/:masterId" element={<RecurringEventSeries />} />
      </Routes>
    </Router>
  );
}

export default App;