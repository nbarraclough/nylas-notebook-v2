import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NotebookPen } from "lucide-react";

export default function Marketing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <NotebookPen className="h-5 w-5" />
              <span className="font-bold text-lg">
                Notebook
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/auth")}
              >
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-3xl py-32 sm:py-48">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Never Miss a Meeting Detail Again
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Notebook automatically records and transcribes your meetings, so you can focus on the conversation. 
              Our AI-powered notetaker joins your calls, captures everything, and makes it easily searchable.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="card-hover-effect"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/auth")}
                className="card-hover-effect"
              >
                Learn more
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary">Record with Confidence</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to capture your meetings
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="flex flex-col card-hover-effect rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Automatic Recording
                </h3>
                <p className="mt-4 text-sm text-gray-600">
                  Our AI notetaker joins your meetings automatically and records everything, so you never have to worry about hitting record.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col card-hover-effect rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Smart Transcription
                </h3>
                <p className="mt-4 text-sm text-gray-600">
                  Get accurate transcripts of your meetings that you can search, share, and reference anytime.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col card-hover-effect rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Easy Sharing
                </h3>
                <p className="mt-4 text-sm text-gray-600">
                  Share recordings and transcripts with your team or external stakeholders with just a few clicks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}