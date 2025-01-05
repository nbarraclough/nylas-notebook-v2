import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const PUBLIC_ROUTES = ['/auth', '/shared'];

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const redirectToAuth = (message?: string) => {
    if (message) {
      toast({
        title: "Authentication Required",
        description: message,
        variant: "destructive",
      });
    }
    
    if (!PUBLIC_ROUTES.includes(location.pathname)) {
      navigate('/auth', { state: { returnTo: location.pathname } });
    }
  };

  return { redirectToAuth };
};