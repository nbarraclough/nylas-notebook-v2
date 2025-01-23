import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings, Video, RefreshCw, ListTodo, UserCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const sections = [
  {
    title: "User Settings",
    items: [
      {
        title: "General",
        icon: Settings,
        path: "/settings",
      },
      {
        title: "Rules",
        icon: Video,
        path: "/settings/recording",
      },
    ],
  },
  {
    title: "Debugging",
    items: [
      {
        title: "Queue",
        icon: ListTodo,
        path: "/settings/queue",
      },
      {
        title: "List of Notetakers",
        icon: UserCheck,
        path: "/settings/notetakers",
      },
      {
        title: "Manual Sync",
        icon: RefreshCw,
        path: "/settings/sync",
      },
    ],
  },
];

export function SettingsSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h2 className={cn(
            "px-2 text-lg font-semibold tracking-tight",
            section.title === "Debugging" && "font-mono"
          )}>
            {section.title}
          </h2>
          <div className="space-y-1">
            {section.items.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  location.pathname === item.path && "bg-accent",
                  section.title === "Debugging" && "font-mono"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}