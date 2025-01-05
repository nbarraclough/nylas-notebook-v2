import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { GeneralSettings } from "@/components/settings/sections/GeneralSettings";
import { RecordingSettings } from "@/components/settings/sections/RecordingSettings";
import { SharingSettings } from "@/components/settings/sections/SharingSettings";
import { ManualSyncSettings } from "@/components/settings/sections/ManualSyncSettings";
import { NotetakersSettings } from "@/components/settings/sections/NotetakersSettings";
import { QueueSettings } from "@/components/settings/sections/QueueSettings";

export default function Settings() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!userId) return null;

  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        
        <div className="flex gap-6">
          <div className="w-64 shrink-0">
            <SettingsSidebar />
          </div>
          
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<GeneralSettings userId={userId} />} />
              <Route path="/organization" element={<OrganizationSettings userId={userId} />} />
              <Route path="/recording" element={<RecordingSettings userId={userId} />} />
              <Route path="/sharing" element={<SharingSettings userId={userId} />} />
              <Route path="/sync" element={<ManualSyncSettings userId={userId} />} />
              <Route path="/queue" element={<QueueSettings userId={userId} />} />
              <Route path="/notetakers" element={<NotetakersSettings userId={userId} />} />
              <Route path="*" element={<Navigate to="/settings" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}