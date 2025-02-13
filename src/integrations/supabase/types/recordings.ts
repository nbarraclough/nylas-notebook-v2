
export type Recording = {
  id: string;
  user_id: string;
  event_id: string;
  recording_url: string | null;
  duration: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  transcript_content: any | null;
  notetaker_id: string | null;
  transcript_url: string | null;
  video_url: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  notetaker_status: string | null;
  meeting_state: string | null;
  media_status: string | null;
  organization_id: string | null;
  transcript_embedding: number[] | null;
  ai_summary: string | null;
  meeting_topics: string[] | null;
  action_items: string[] | null;
};

export type RecordingInsert = {
  id?: string;
  user_id: string;
  event_id: string;
  recording_url?: string | null;
  duration?: number | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  transcript_content?: any | null;
  notetaker_id?: string | null;
  transcript_url?: string | null;
  video_url?: string | null;
  mux_asset_id?: string | null;
  mux_playback_id?: string | null;
  notetaker_status?: string | null;
  meeting_state?: string | null;
  media_status?: string | null;
  organization_id?: string | null;
  transcript_embedding?: number[] | null;
  ai_summary?: string | null;
  meeting_topics?: string[] | null;
  action_items?: string[] | null;
};

export type RecordingUpdate = Partial<RecordingInsert>;

