import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <span className="hidden font-bold sm:inline-block">
            Notebook
          </span>
        </Link>
        <div className="flex items-center space-x-4 lg:space-x-6">
          <Link
            to="/calendar"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Calendar
          </Link>
          <Link
            to="/queue"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Queue
          </Link>
          <Link
            to="/recordings"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Recordings
          </Link>
          <Link
            to="/manual"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Manual
          </Link>
          <Link
            to="/settings"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
