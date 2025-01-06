import type { Json } from './json';
import type { AuditLog, AuditLogInsert, AuditLogUpdate, AuditAction } from './audit';
import type { ManualMeeting, ManualMeetingInsert, ManualMeetingUpdate } from './manual-meetings';
import type { NotetakerQueue, NotetakerQueueInsert, NotetakerQueueUpdate } from './notetaker-queue';

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
        Relationships: []
      };
      events: {
        Row: {
          busy: boolean | null
          conference_url: string | null
          created_at: string
          description: string | null
          end_time: string
          html_link: string | null
          ical_uid: string | null
          id: string
          last_updated_at: string
          location: string | null
          master_event_id: string | null
          nylas_event_id: string
          organizer: Json | null
          original_start_time: string | null
          participants: Json | null
          read_only: boolean | null
          recurrence: string[] | null
          reminders: Json | null
          resources: Json | null
          start_time: string
          status: string | null
          title: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          busy?: boolean | null
          conference_url?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          html_link?: string | null
          ical_uid?: string | null
          id?: string
          last_updated_at?: string
          location?: string | null
          master_event_id?: string | null
          nylas_event_id: string
          organizer?: Json | null
          original_start_time?: string | null
          participants?: Json | null
          read_only?: boolean | null
          recurrence?: string[] | null
          reminders?: Json | null
          resources?: Json | null
          start_time: string
          status?: string | null
          title: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          busy?: boolean | null
          conference_url?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          html_link?: string | null
          ical_uid?: string | null
          id?: string
          last_updated_at?: string
          location?: string | null
          master_event_id?: string | null
          nylas_event_id?: string
          organizer?: Json | null
          original_start_time?: string | null
          participants?: Json | null
          read_only?: boolean | null
          recurrence?: string[] | null
          reminders?: Json | null
          resources?: Json | null
          start_time?: string
          status?: string | null
          title?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      manual_meetings: {
        Row: ManualMeeting;
        Insert: ManualMeetingInsert;
        Update: ManualMeetingUpdate;
        Relationships: [
          {
            foreignKeyName: "manual_meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notetaker_queue: {
        Row: NotetakerQueue;
        Insert: NotetakerQueueInsert;
        Update: NotetakerQueueUpdate;
        Relationships: [
          {
            foreignKeyName: "notetaker_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notetaker_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          notetaker_name: string | null
          nylas_grant_id: string | null
          record_external_meetings: boolean | null
          record_internal_meetings: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          created_at: string
          duration: number | null
          event_id: string
          id: string
          recording_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          event_id: string
          id?: string
          recording_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          event_id?: string
          id?: string
          recording_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    };
    Views: Record<string, never>;
    Functions: {
      should_record_event: {
        Args: {
          event_organizer: Json
          event_participants: Json
          record_internal: boolean
          record_external: boolean
        }
        Returns: boolean
      }
      update_profile_grant_id: {
        Args: {
          p_user_id: string
          p_grant_id: string
        }
        Returns: Json
      }
    };
    Enums: {
      audit_action: AuditAction;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
