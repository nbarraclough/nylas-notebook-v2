import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { VideoPlayerView } from "@/components/library/VideoPlayerView";

export default function Video() {
  const { recordingId } = useParams();
  const navigate = useNavigate();

  if (!recordingId) {
    return null;
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <VideoPlayerView 
          recordingId={recordingId} 
          onClose={() => navigate("/library")}
        />
      </div>
    </PageLayout>
  );
}