import { createBrowserRouter } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Calendar from "./pages/Calendar";
import Queue from "./pages/Queue";
import Recordings from "./pages/Recordings";
import Settings from "./pages/Settings";
import { SharedVideoView } from "./components/shared/SharedVideoView";
import Shared from "./pages/Shared";

// Define the router with all routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/calendar",
    element: <Calendar />,
  },
  {
    path: "/queue",
    element: <Queue />,
  },
  {
    path: "/recordings",
    element: <Recordings />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/shared",
    element: <Shared />,
  },
  {
    path: "/shared/:token",
    element: <SharedVideoView />,
  },
]);

export default router;