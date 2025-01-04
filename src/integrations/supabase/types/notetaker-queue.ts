export type NotetakerQueue = {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  attempts: number | null;
  last_attempt: string | null;
  error: string | null;
  created_at: string;
  scheduled_for: string;
  event?: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    conference_url: string | null;
    participants: any[];
    organizer: any;
  };
};

export type NotetakerQueueInsert = {
  id?: string;
  user_id: string;
  event_id: string;
  status?: string;
  attempts?: number | null;
  last_attempt?: string | null;
  error?: string | null;
  created_at?: string;
  scheduled_for: string;
};

export type NotetakerQueueUpdate = Partial<NotetakerQueueInsert>;