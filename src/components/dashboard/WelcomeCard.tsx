import { Card } from "@/components/ui/card";

interface WelcomeCardProps {
  email: string;
}

export function WelcomeCard({ email }: WelcomeCardProps) {
  const firstName = email.split('@')[0];
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">
        Welcome back, {firstName}!
      </h2>
      <p className="text-muted-foreground">
        Notebook helps you record, manage and share your meeting recordings efficiently.
      </p>
    </div>
  );
}