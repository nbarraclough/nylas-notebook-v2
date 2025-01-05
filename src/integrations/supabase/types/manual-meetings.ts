export type ManualMeeting = {
  id: string;
  user_id: string;
  title: string;
  meeting_url: string;
  created_at: string;
  updated_at: string;
};

export type ManualMeetingInsert = {
  id?: string;
  user_id: string;
  title?: string;
  meeting_url: string;
  created_at?: string;
  updated_at?: string;
};

export type ManualMeetingUpdate = Partial<ManualMeetingInsert>;