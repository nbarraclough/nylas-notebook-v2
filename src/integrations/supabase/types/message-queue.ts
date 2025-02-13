
export type MessageQueue = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  message_type: string;
  payload: any;
  priority: number;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  error_message: string | null;
  user_id: string | null;
  organization_id: string | null;
};

export type MessageQueueInsert = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  message_type: string;
  payload?: any;
  priority?: number;
  attempts?: number;
  max_attempts?: number;
  scheduled_for?: string;
  error_message?: string | null;
  user_id?: string | null;
  organization_id?: string | null;
};

export type MessageQueueUpdate = Partial<MessageQueueInsert>;

