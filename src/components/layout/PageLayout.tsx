import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl flex-1">
        <main className="space-y-6">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}