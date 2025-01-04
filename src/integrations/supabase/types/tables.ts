import type { Json } from './json';
import type { Event, EventInsert, EventUpdate } from './events';
import type { Profile, ProfileInsert, ProfileUpdate } from './profiles';
import type { Recording, RecordingInsert, RecordingUpdate } from './recordings';
import type { NotetakerQueue, NotetakerQueueInsert, NotetakerQueueUpdate } from './notetaker-queue';

export type Database = {
  public: {
    Tables: {
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      recordings: {
        Row: Recording;
        Insert: RecordingInsert;
        Update: RecordingUpdate;
      };
      notetaker_queue: {
        Row: NotetakerQueue;
        Insert: NotetakerQueueInsert;
        Update: NotetakerQueueUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_profile_grant_id: {
        Args: {
          p_user_id: string;
          p_grant_id: string;
        };
        Returns: any;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];