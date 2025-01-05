import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/calendar");
  }, [navigate]);

  // Return a loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center animate-pulse">
        <p className="text-xl text-gray-600">Redirecting to Calendar...</p>
      </div>
    </div>
  );
};

export default Index;