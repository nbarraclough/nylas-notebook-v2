import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CalendarDays, Settings, QueueList, Video } from "lucide-react";

const navItems = [
  { name: "Calendar", path: "/calendar", icon: CalendarDays },
  { name: "Queue", path: "/queue", icon: QueueList },
  { name: "Recordings", path: "/recordings", icon: Video },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="mr-8 flex items-center space-x-2">
          <span className="text-xl font-bold">Notebook</span>
        </Link>
        <div className="flex space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}