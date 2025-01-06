import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    // Get the current route and format it for the title
    const path = location.pathname;
    let pageTitle = "Notebook"; // Default title

    // Map routes to their respective titles
    if (path === "/") {
      pageTitle = "Dashboard - Notebook";
    } else if (path === "/auth") {
      pageTitle = "Authentication - Notebook";
    } else if (path === "/calendar") {
      pageTitle = "Calendar - Notebook";
    } else if (path === "/library") {
      pageTitle = "Library - Notebook";
    } else if (path === "/recordings") {
      pageTitle = "Recordings - Notebook";
    } else if (path === "/settings") {
      pageTitle = "Settings - Notebook";
    } else if (path === "/shared") {
      pageTitle = "Shared - Notebook";
    } else if (path.startsWith("/recurring-events")) {
      pageTitle = "Recurring Events - Notebook";
    }

    // Update the document title
    document.title = pageTitle;
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}