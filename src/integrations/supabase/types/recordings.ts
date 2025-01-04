export type Recording = {
  id: string;
  user_id: string;
  event_id: string;
  recording_url: string;
  duration: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type RecordingInsert = {
  id?: string;
  user_id: string;
  event_id: string;
  recording_url: string;
  duration?: number | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type RecordingUpdate = Partial<RecordingInsert>;