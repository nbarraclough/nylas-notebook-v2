import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotetakerSettings } from "@/components/settings/NotetakerSettings";
import { RecordingRules } from "@/components/settings/RecordingRules";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";

export default function Settings() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [notetakerName, setNotetakerName] = useState("");
  const [recordExternal, setRecordExternal] = useState(false);
  const [recordInternal, setRecordInternal] = useState(false);
  const [shareExternal, setShareExternal] = useState(false);
  const [shareInternal, setShareInternal] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

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

  // Update local state when profile data is loaded
  useEffect(() => {
    if (profile) {
      setNotetakerName(profile.notetaker_name || "");
      setRecordExternal(profile.record_external_meetings || false);
      setRecordInternal(profile.record_internal_meetings || false);
      setShareExternal(profile.share_external_recordings || false);
      setShareInternal(profile.share_internal_recordings || false);
    }
  }, [profile]);

  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        
        {userId && (
          <>
            <OrganizationSettings userId={userId} />
            <NotetakerSettings 
              userId={userId}
              notetakerName={notetakerName}
              onNotetakerNameChange={setNotetakerName}
            />
            <RecordingRules
              userId={userId}
              recordExternal={recordExternal}
              recordInternal={recordInternal}
              shareExternal={shareExternal}
              shareInternal={shareInternal}
              onRulesChange={(updates) => {
                if (updates.record_external_meetings !== undefined) {
                  setRecordExternal(updates.record_external_meetings);
                }
                if (updates.record_internal_meetings !== undefined) {
                  setRecordInternal(updates.record_internal_meetings);
                }
                if (updates.share_external_recordings !== undefined) {
                  setShareExternal(updates.share_external_recordings);
                }
                if (updates.share_internal_recordings !== undefined) {
                  setShareInternal(updates.share_internal_recordings);
                }
              }}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}