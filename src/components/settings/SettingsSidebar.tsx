import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings, Users, Video, RefreshCw, ListTodo, UserCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const categories = [
  {
    title: "General",
    icon: Settings,
    path: "/settings",
  },
  {
    title: "Organization",
    icon: Users,
    path: "/settings/organization",
  },
  {
    title: "Rules",
    icon: Video,
    path: "/settings/recording",
  },
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
];

export function SettingsSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="space-y-2">
      {categories.map((category) => (
        <Button
          key={category.path}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2",
            location.pathname === category.path && "bg-accent"
          )}
          onClick={() => navigate(category.path)}
        >
          <category.icon className="h-4 w-4" />
          {category.title}
        </Button>
      ))}
    </nav>
  );
}