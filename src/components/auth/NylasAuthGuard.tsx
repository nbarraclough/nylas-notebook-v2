import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Pages that don't require Nylas authentication
const EXEMPT_ROUTES = [
  '/auth',
  '/calendar', // Calendar page already handles Nylas auth
  '/settings',
];

export const NylasAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkNylasGrant = async () => {
      // Skip check for exempt routes
      if (EXEMPT_ROUTES.some(route => location.pathname.startsWith(route))) {
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('grant_status')
        .eq('id', session.user.id)
        .single();

      // Redirect unless grant_status is explicitly 'active'
      if (profile?.grant_status !== 'active') {
        console.log('Redirecting due to grant_status:', profile?.grant_status);
        toast({
          title: "Calendar Connection Required",
          description: "Your calendar access needs to be reconnected. Redirecting to calendar page...",
          variant: "destructive",
        });
        navigate('/calendar');
      }
    };

    checkNylasGrant();
  }, [location.pathname, navigate, toast]);

  return <>{children}</>;
};